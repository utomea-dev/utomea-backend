import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Photo } from "./Photo.entity";
import { User } from "./User.entity";
import { Category } from "./Category.entity";
import { EventType } from "../enums/eventEnums";

@Entity()
@Index(["latitude", "longitude", "begin_timestamp", "user"], { unique: true })
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("varchar", { length: 100 })
  latitude: string;

  @Column("varchar", { length: 100 })
  longitude: string;

  @Column("varchar", { length: 400, nullable: true })
  location: string;

  @Column({ type: "timestamptz", nullable: false })
  begin_timestamp: Date;

  @Column({ type: "timestamptz", nullable: false })
  end_timestamp: Date;

  @Column("varchar", { length: 400, nullable: true })
  title: string;

  @Column("varchar", { array: true, nullable: true })
  tags: string[];

  @Column("text", { nullable: true })
  description: string;

  @Column({ type: "float", nullable: true })
  rating: number;

  @Column({ type: "boolean", default: false })
  verified: boolean;

  @OneToMany(
    () => Photo,
    (photo) => photo.event
  )
  photos: Photo[];

  @Column({ type: "boolean", default: false })
  is_deleted: boolean;

  @Column({type: "enum", enum: EventType, nullable: true})
  event_type: EventType

  @Column("integer", {nullable: true})
  hero_image_id: number;

  @ManyToOne(
    () => User,
    (user) => user.events
  )
  user: User;

  @ManyToOne(
    () => Category,
    (category) => category.events
  )
  category: Category;
}
