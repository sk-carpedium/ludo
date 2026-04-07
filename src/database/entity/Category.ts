import {Entity, PrimaryGeneratedColumn, Index, Column, BaseEntity, OneToMany} from 'typeorm';
import { Length, IsNumber, Min } from 'class-validator';
import { Table } from './Table';
import { CategoryPrice } from './CategoryPrice';

@Entity({ name: 'categories' })
export class Category extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column('uuid', { unique: true, default: () => 'uuid_generate_v4()' })
    uuid!: string;

    @Column()
    @Length(1, 75)
    name!: string;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    @IsNumber()
    @Min(0)
    hourlyRate!: number;

    @Column({ default: 'PKR' })
    currencyName!: string;

    @Column({ name: 'enable_person_count', type: 'boolean', default: false })
    enablePersonCount!: boolean;

    @Column({ name: 'company_id' })
    @Index()
    companyId!: number;

    /**
     * Relations
     */
    @OneToMany(() => Table, table => table.category)
    tables?: Table[];

    @OneToMany(() => CategoryPrice, categoryPrice => categoryPrice.category,{
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    categoryPrices?: CategoryPrice[];

}
