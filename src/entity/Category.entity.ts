import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Event } from "./Event.entity";

@Entity()
export class Category {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("varchar", {length: 100})
    name: string

    @OneToMany(() => Event, (event) => event.category)
    events: Event[]
}