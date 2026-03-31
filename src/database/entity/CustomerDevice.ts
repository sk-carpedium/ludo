import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    BaseEntity,
} from 'typeorm';
import { Customer } from './Customer';

@Entity({ name: 'customer_devices' })
export class CustomerDevice extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'device_token' })
    deviceToken!: string;

    @Column({ name: 'device_type' })
    deviceType!: string; // android / ios / web

    @Column({ name: 'fcm_token', nullable: true })
    fcmToken?: string; // Firebase Cloud Messaging token

    @Column({ name: 'customer_id' })
    customerId!: number;

    @ManyToOne(() => Customer, (customer) => customer.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'customer_id' })
    customer!: Customer;

    @CreateDateColumn({
        type: 'timestamptz',
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        type: 'timestamptz',
        name: 'updated_at',
    })
    updatedAt!: Date;
}