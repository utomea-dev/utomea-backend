import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Event } from "./Event.entity";
import { ACCOUNT_TYPE, AutoEntryTime } from "../enums/userEnums";
import { ExcludedList } from "./ExcludedList.entity";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("varchar", { nullable: true })
  name: string;

  @Column("varchar")
  email: string;

  @Column("varchar", {nullable: true})
  password: string;

  @Column({ type: "boolean", default: false })
  is_verified: boolean;

  @Column({ type: "boolean", default: false })
  privacy_policy_accepted: boolean;

  @Column({
    type: "enum",
    enum: AutoEntryTime,
    default: AutoEntryTime.THIRTY_MINS,
  })
  auto_entry_time: AutoEntryTime;


  @Column({
    type: "enum",
    enum: ACCOUNT_TYPE,
    default: ACCOUNT_TYPE.NORMAL_EMAIL
  })
  account_type: ACCOUNT_TYPE;

  @Column({ type: "boolean", default: false })
  is_deleted: boolean;

  @Column({ type: "boolean", default: true })
  is_new_user: boolean;

  @Column({ type: "boolean", default: false })
  auto_verification: boolean;
  
  @Column("varchar", {nullable: true})
  profile_pic: string;

  @Column({ nullable: true })
  verificationCode: string;

  @Column({ type: 'timestamp', nullable: true })
  verificationCodeExpiry: Date;

  @OneToMany(
    () => Event,
    (event) => event.user
  )
  events: Event[];

  @OneToMany(
    () => ExcludedList,
    (location) => location.user
  )
  excludedLocations: ExcludedList[];
}
