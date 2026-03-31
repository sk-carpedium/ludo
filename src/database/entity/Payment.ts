import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    Index
  } from 'typeorm';
  import { Invoice } from './Invoice';
  import { Customer } from './Customer';
  import { TableSession } from './TableSession';
  import { Tournament } from './Tournament';
  import { PaymentStatus, PaymentMethod } from '../../schema/payment/types';
  
  @Entity({ name: 'payments' })
  export class Payment {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column('uuid', { unique: true, default: () => 'uuid_generate_v4()' })
    uuid!: string;

    @Column({ name: 'customer_id' })
    @Index()
    customerId: number;

    @Column({ name: 'invoice_id', nullable: true })
    @Index()
    invoiceId: string | null;

    @Column({ name: 'table_session_id', nullable: true })
    @Index()
    tableSessionId: number | null;

    @Column({ name: 'tournament_id', type: 'int', nullable: true })
    @Index()
    tournamentId: number | null;
  
    @Column({ type: 'int', default: 1 })
    personCount: number;

    @Column({ type: 'numeric', precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
    taxRate: number;

    @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
    taxAmount: number;

    @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
    totalAmount: number;
  
    @Column({
      type: 'enum',
      enum: PaymentMethod,
      default: PaymentMethod.CASH,
    })
    method: PaymentMethod;

    @Column({
      type: 'enum',
      enum: PaymentStatus,
      default: PaymentStatus.SUCCESS,
    })
    status: PaymentStatus;

    @Column({ type: 'varchar', length: 255, nullable: true })
    refundNote: string | null;

    @Column({ type: 'timestamp', nullable: true })
    refundedAt: Date | null;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    /**
     * Relations
     */

    @ManyToOne(() => Invoice)
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;
  
    @ManyToOne(() => Customer, { nullable: false })
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;

    @ManyToOne(() => TableSession, { nullable: true })
    @JoinColumn({ name: 'table_session_id' })
    tableSession: TableSession | null;

    @ManyToOne(() => Tournament, { nullable: true })
    @JoinColumn({ name: 'tournament_id' })
    tournament: Tournament | null;
  }
  