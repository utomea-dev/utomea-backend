import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Event } from "./Event.entity";
import { AutoEntryTime } from "../enums/userEnums";


@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column("varchar", {nullable: true})
    name: string

    @Column("varchar")
    email: string

    @Column("varchar")
    password: string

    @Column({ type: "boolean", default: true })
    is_verified: boolean;

    @Column({ type: "boolean", default: false })
    privacy_policy_accepted: boolean;

    @Column({type: "enum", enum: AutoEntryTime, default: AutoEntryTime.THIRTY_MINS})
    auto_entry_time: AutoEntryTime

    @Column({ type: "boolean", default: false })
    is_deleted: boolean; 

    @OneToMany(() => Event, (event) => event.user)
    events: Event[]

}