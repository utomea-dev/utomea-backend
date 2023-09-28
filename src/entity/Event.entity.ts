import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Photo } from "./Photo.entity";
import { User } from "./User.entity";
import { Category } from "./Category.entity";

@Entity()
@Index(["latitude", "longitude", "begin_timestamp"], { unique: true })
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
