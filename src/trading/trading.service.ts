import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from './position.entity';
import { Price } from '../price/price.entity';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

@Injectable()
export class TradingService {
  private readonly FEE_PERCENTAGE = 0.025;
  private readonly MIN_WITHDRAWAL = 10; 

  constructor(
    @InjectRepository(Position) private positionRepo: Repository<Position>,
    @InjectRepository(Price) private priceRepo: Repository<Price>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
  ) {}

  async getBalance(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return 0;
    return Number(user.balance);
  }

  async deposit(userId: number, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive!');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Invalid user.');
    
    user.balance = Number(user.balance) + amount;
    await this.userRepo.save(user);

    const tx = this.txRepo.create({ userId, type: 'DEPOSIT', amount, status: 'COMPLETED' });
    await this.txRepo.save(tx);

    return { balance: user.balance, message: 'Deposit successful!' };
  }

  async withdraw(userId: number, amount: number) {
    if (amount < this.MIN_WITHDRAWAL) {
      throw new BadRequestException(`Minimum withdrawal amount is $${this.MIN_WITHDRAWAL}!`);
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Invalid user.');

    // Security: Email verification check
    if (!user.isEmailVerified) {
      throw new BadRequestException('You must verify your email to withdraw funds!');
    }

    if (Number(user.balance) < amount) {
      throw new BadRequestException('Insufficient funds for withdrawal!');
    }
    
    user.balance = Number(user.balance) - amount;
    await this.userRepo.save(user);

    const tx = this.txRepo.create({ userId, type: 'WITHDRAW', amount, status: 'PENDING' });
    await this.txRepo.save(tx);

    return { balance: user.balance, message: 'Withdrawal recorded (Pending approval)!' };
  }

  async getTransactions(userId: number) {
    return this.txRepo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 20 });
  }

  async openPosition(type: 'LONG' | 'SHORT', amount: number, assetName: string, userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found!');
    if (Number(user.balance) < amount) throw new BadRequestException('Insufficient funds!');

    const currentPrice = await this.priceRepo.findOne({ where: { assetName }, order: { createdAt: 'DESC' } });
    if (!currentPrice) throw new BadRequestException('Price for this asset is currently unavailable!');

    const newPosition = this.positionRepo.create({
      userId, assetName, type, entryPrice: currentPrice.price, amount, status: 'OPEN',
    });

    user.balance = Number(user.balance) - amount;
    await this.userRepo.save(user);
    await this.positionRepo.save(newPosition);
    return newPosition;
  }

  async getOpenPositions(userId: number) {
    const positions = await this.positionRepo.find({ where: { userId, status: 'OPEN' }, order: { createdAt: 'DESC' } });
    return Promise.all(positions.map(async (pos) => {
      const livePriceEntry = await this.priceRepo.findOne({ where: { assetName: pos.assetName }, order: { createdAt: 'DESC' } });
      const livePrice = livePriceEntry ? Number(livePriceEntry.price) : Number(pos.entryPrice);
      
      const diff = livePrice - Number(pos.entryPrice);
      const quantity = Number(pos.amount) / Number(pos.entryPrice);
      const grossProfit = pos.type === 'LONG' ? (diff * quantity) : (-diff * quantity);
      
      const grossValue = Number(pos.amount) + grossProfit;
      const fee = grossValue * this.FEE_PERCENTAGE;
      const liveProfitNet = grossProfit - fee;

      return { ...pos, currentPrice: livePrice, liveProfit: liveProfitNet };
    }));
  }

  async getHistory(userId: number) {
    return this.positionRepo.find({ where: { userId, status: 'CLOSED' }, order: { createdAt: 'DESC' }, take: 20 });
  }

  async closePosition(id: number, userId: number) {
    const position = await this.positionRepo.findOne({ where: { id, userId } });
    if (!position || position.status === 'CLOSED') throw new BadRequestException('Transaction does not exist or is already closed!');

    const currentPrice = await this.priceRepo.findOne({ where: { assetName: position.assetName }, order: { createdAt: 'DESC' } });
    if (!currentPrice) throw new BadRequestException('Live price unavailable for settlement!');

    const diff = Number(currentPrice.price) - Number(position.entryPrice);
    const quantity = Number(position.amount) / Number(position.entryPrice);
    const grossProfit = position.type === 'LONG' ? (diff * quantity) : (-diff * quantity);

    const grossValue = Number(position.amount) + grossProfit;
    const fee = grossValue * this.FEE_PERCENTAGE; 
    const netProfit = grossProfit - fee;

    position.status = 'CLOSED';
    position.closePrice = currentPrice.price;
    position.profit = netProfit;

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Critical error: User not found!');

    user.balance = Number(user.balance) + Number(position.amount) + netProfit;
    
    await this.positionRepo.save(position);
    await this.userRepo.save(user);

    return position;
  }

  async getAnalytics(userId: number) {
    const history = await this.positionRepo.find({ where: { userId, status: 'CLOSED' } });
    const user = await this.userRepo.findOne({ where: { id: userId } });

    let totalProfit = 0;
    let winningTrades = 0;
    let bestTrade: Position | null = null; 

    for (const trade of history) {
      const profit = Number(trade.profit);
      totalProfit += profit;
      
      if (profit > 0) {
        winningTrades++;
        if (!bestTrade || profit > Number(bestTrade.profit)) {
          bestTrade = trade;
        }
      }
    }

    const winRate = history.length > 0 ? (winningTrades / history.length) * 100 : 0;

    return {
      netWorth: user ? Number(user.balance) : 0,
      totalTrades: history.length,
      winRate: winRate,
      totalProfit: totalProfit,
      bestTrade: bestTrade ? { assetName: bestTrade.assetName, profit: Number(bestTrade.profit) } : null,
    };
  }

  async getAdminStats() {
    // Selectăm și isEmailVerified pentru a vedea statusul în Admin Dashboard
    const users = await this.userRepo.find({ 
      select: ['id', 'username', 'balance', 'steamId', 'avatar', 'isEmailVerified'] 
    });
    
    const transactions = await this.txRepo.find({ order: { createdAt: 'DESC' }, take: 50 });
    
    const totalPlatformBalance = users.reduce((sum, u) => sum + Number(u.balance), 0);
    const pendingWithdrawals = transactions.filter(tx => tx.type === 'WITHDRAW' && tx.status === 'PENDING').length;

    const txsWithUsers = transactions.map(tx => {
      const u = users.find(user => user.id === tx.userId);
      return { ...tx, username: u ? u.username : 'Unknown' };
    });

    return {
      totalUsers: users.length,
      totalPlatformBalance,
      pendingWithdrawals,
      users,
      transactions: txsWithUsers,
    };
  }

  async approveWithdrawal(txId: number) {
    const tx = await this.txRepo.findOne({ where: { id: txId } });
    if (!tx || tx.type !== 'WITHDRAW' || tx.status !== 'PENDING') {
      throw new BadRequestException('Transaction not found or already processed!');
    }
    tx.status = 'COMPLETED';
    await this.txRepo.save(tx);
    return { message: 'Withdrawal approved successfully!' };
  }

  async rejectWithdrawal(txId: number) {
    const tx = await this.txRepo.findOne({ where: { id: txId } });
    if (!tx || tx.type !== 'WITHDRAW' || tx.status !== 'PENDING') {
      throw new BadRequestException('Transaction not found or already processed!');
    }

    tx.status = 'REJECTED';
    await this.txRepo.save(tx);

    const user = await this.userRepo.findOne({ where: { id: tx.userId } });
    if (user) {
      user.balance = Number(user.balance) + Number(tx.amount);
      await this.userRepo.save(user);
    }

    return { message: 'Withdrawal rejected. Funds returned to user balance.' };
  }
}