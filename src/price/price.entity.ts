import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Price {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  assetName: string; // Ex: "Butterfly Doppler"

  @Column('decimal', { precision: 10, scale: 2 })
  price: number; // Ex: 508.00

  // --- ADAUGATE PENTRU SPREAD-UL DE BROKER ---
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  bidPrice: number; 

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  askPrice: number; 
  // ------------------------------------------

  @Column()
  source: string; // Ex: "Hourly Snapshot"

  @CreateDateColumn()
  createdAt: Date; // Data și ora exactă a prețului
}