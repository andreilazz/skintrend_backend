import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../trading/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto'; 
import { MailerService } from '@nestjs-modules/mailer'; // <-- IMPORT NOU

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private readonly mailerService: MailerService, // <-- INJECTARE NOUĂ
  ) {}

  async validateSteamUser(profile: any) {
    let user = await this.userRepo.findOne({ where: { steamId: profile.id } });
    
    if (!user) {
      user = this.userRepo.create({
        username: profile.displayName,
        steamId: profile.id,
        avatar: profile.photos && profile.photos[2] ? profile.photos[2].value : null,
        balance: 10000,
      });
      await this.userRepo.save(user);
    } else {
      user.username = profile.displayName;
      user.avatar = profile.photos && profile.photos[2] ? profile.photos[2].value : null;
      await this.userRepo.save(user);
    }
    return user;
  }

  generateJwtForSteam(user: User) {
    const payload = { sub: user.id, username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
      user: { username: user.username, balance: user.balance, tradeLink: user.tradeLink, avatar: user.avatar }
    };
  }

  async register(username: string, pass: string) {
    const existing = await this.userRepo.findOne({ where: { username } });
    if (existing) throw new BadRequestException('Utilizatorul exista deja!');

    const hashedPassword = await bcrypt.hash(pass, 10);
    const user = this.userRepo.create({ username, password: hashedPassword, balance: 10000 });
    await this.userRepo.save(user);
    return { message: 'Cont creat cu succes!' };
  }

  async login(username: string, pass: string) {
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user || !user.password) throw new UnauthorizedException('Date incorecte!');

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) throw new UnauthorizedException('Date incorecte!');

    const payload = { sub: user.id, username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
      user: { username: user.username, balance: user.balance, tradeLink: user.tradeLink, avatar: user.avatar }
    };
  }

  // --- ACTUALIZAT: Returnăm și email-ul ---
  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User invalid');
    return { 
      username: user.username, 
      tradeLink: user.tradeLink || '', 
      avatar: user.avatar,
      email: user.email || '', 
      isEmailVerified: user.isEmailVerified
    };
  }

  // --- ACTUALIZAT: Permitem update de email ---
  async updateProfile(userId: number, tradeLink?: string, newPassword?: string, email?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User invalid');
    
    if (tradeLink !== undefined) user.tradeLink = tradeLink;
    
    if (email !== undefined && email !== user.email) {
      user.email = email;
      user.isEmailVerified = false;
      user.emailVerificationToken = null;
    }

    if (newPassword && newPassword.length > 3) {
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await this.userRepo.save(user);
    return { message: 'Profil actualizat cu succes!', tradeLink: user.tradeLink, email: user.email };
  }

 // --- ACTUALIZAT: Trimite Email REAL prin Resend ---
 async sendVerificationEmail(userId: number, email: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User invalid');

    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    user.email = email;
    await this.userRepo.save(user);

    const verificationUrl = `http://localhost:3000/verify-email?token=${token}`;
    
    // Aici apelăm serviciul de mail configurat în AppModule
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Verify your SkinTrend account',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000; color: #fff; padding: 40px; border-radius: 20px; text-align: center;">
            <h1 style="color: #fff; font-size: 28px; font-weight: 700; letter-spacing: -1px;">SkinTrend.</h1>
            <p style="color: #86868b; font-size: 16px; margin: 20px 0;">Verify your email to secure your account and start trading digital assets.</p>
            <a href="${verificationUrl}" style="background-color: #fff; color: #000; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: 600; display: inline-block; margin: 20px 0;">Verify Email</a>
            <p style="color: #424245; font-size: 12px; margin-top: 30px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Eroare trimitere mail:', error);
      throw new BadRequestException('Nu s-a putut trimite email-ul de verificare.');
    }

    return { message: 'Verification email sent successfully!' };
  }

  async confirmEmail(token: string) {
    const user = await this.userRepo.findOne({ where: { emailVerificationToken: token } });
    if (!user) throw new BadRequestException('Token invalid sau expirat.');

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    await this.userRepo.save(user);

    return { message: 'Email verificat cu succes!' };
  }
}