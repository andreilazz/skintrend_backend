import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class News {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  link: string;

  @Column()
  date: string;

  @Column({ type: 'text' })
  snippet: string;
  
  @Column({ default: 'low' })
  impact: string;

}