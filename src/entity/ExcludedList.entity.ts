import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User.entity";

@Entity()
@Index(["latitude", "longitude", "user"], { unique: true })
export class ExcludedList {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("varchar", { length: 400, nullable: true })
  identifier: string;

  @Column("integer")
  radius: number;

  @Column("varchar", { length: 100 })
  latitude: string;

  @Column("varchar", { length: 100 })
  longitude: string;

  @ManyToOne(
    () => User,
    (user) => user.excludedLocations
  )
  user: User;
}
