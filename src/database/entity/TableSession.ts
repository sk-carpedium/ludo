import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Customer } from './Customer';
import { Table } from './Table';
import { CategoryPriceUnit } from '../../schema/category/types';
import { IsOptional, Min } from 'class-validator';
import { IsNumber } from 'class-validator';

export enum TableSessionStatus {
  BOOKED = 'booked',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'table_sessions' })
@Index(['tableId', 'status'], { unique: true, where: "status IN ('booked', 'active')" })
export class TableSession {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('uuid', { unique: true, default: () => 'uuid_generate_v4()' })
  uuid!: string;

  @Column({ name: 'customer_id' })
  @Index()
  customerId: number;

  @Column({ name: 'table_id' })
  @Index()
  tableId: number;

  @Column({ type: 'timestamptz', name: 'start_time', nullable: true })
  startTime: Date | null;

  @Column({ type: 'timestamptz', name: 'end_time', nullable: true })
  endTime: Date | null;

  @Column({ type: 'enum', enum: CategoryPriceUnit })
  unit: CategoryPriceUnit;

  @Column('integer', { name: 'duration' })
  @IsNumber()
  @Min(0)
  duration: number;

  @Column('integer', { name: 'free_mins', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeMins?: number;

  @Column('integer', { name: 'person_count', default: 1 })
  @IsNumber()
  @Min(1)
  personCount: number;

  @Column({ type: 'enum', enum: TableSessionStatus, default: TableSessionStatus.BOOKED })
  status: TableSessionStatus;

  /**
  * Relations
  */

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Table, { nullable: false })
  @JoinColumn({ name: 'table_id' })
  table: Table;
}
