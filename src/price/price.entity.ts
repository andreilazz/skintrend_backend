import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Price {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  assetName: string; // Ex: "Butterfly Doppler"

  @Column('decimal', { precision: 10, scale: 2 })
  price: number; // Ex: 508.00

  @Column()
  source: string; // Ex: "Composite (Buff+Float)"

  @CreateDateColumn()
  createdAt: Date; // Data și ora exactă a prețului
}