import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Position {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number; // ID-ul utilizatorului care a deschis pozitia

  @Column()
  assetName: string;

  @Column()
  type: string;

  @Column('decimal', { precision: 10, scale: 2 })
  entryPrice: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'OPEN' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  closePrice: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  profit: number;
}