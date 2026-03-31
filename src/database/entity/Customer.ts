import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    BaseEntity,
    Index,
} from 'typeorm';
import { Length } from 'class-validator';
import { OneToMany } from 'typeorm';
import { CustomerDevice } from './CustomerDevice';

@Entity({ name: 'customers' })
export class Customer extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column('uuid', { unique: true, default: () => 'uuid_generate_v4()' })
    uuid!: string;

    @Column({ name: 'first_name' })
    @Length(1, 50)
    firstName!: string;

    @Column({ name: 'last_name' })
    @Length(1, 50)
    lastName!: string;

    @Column({ name: 'phone_code', nullable: true })
    @Length(1, 4)
    phoneCode?: string;

    @Column({ name: 'phone_number', nullable: true })
    @Length(1, 15)
    phoneNumber?: string;

    @Column({ name: 'company_id' })
    @Index()
    companyId!: number;

    @Column('date', { name: 'dob', nullable: true })
    dob?: Date | null;

    @CreateDateColumn({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP(6)',
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)',
        name: 'updated_at',
    })
    updatedAt!: Date;

    @OneToMany(() => CustomerDevice, (device) => device.customer)
    devices!: CustomerDevice[];
}
