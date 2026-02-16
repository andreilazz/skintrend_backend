import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  type: string; // 'DEPOSIT' sau 'WITHDRAW'

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'COMPLETED' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}