import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  password: string;

  @Column('decimal', { precision: 12, scale: 2, default: 10000 })
  balance: number;

  @Column({ nullable: true })
  tradeLink: string;

  @Column({ unique: true, nullable: true })
  steamId: string;

  @Column({ nullable: true })
  avatar: string;

  // --- NOU: EMAIL & VERIFICARE ---
  @Column({ type: 'varchar', nullable: true }) // Adăugăm type: 'varchar'
  email: string | null;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ type: 'varchar', nullable: true }) // Adăugăm type: 'varchar'
  emailVerificationToken: string | null;
}