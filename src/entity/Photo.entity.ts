import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Event } from "./Event.entity";

@Entity()
export class Photo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("varchar")
  url: string;

  @ManyToOne(
    () => Event,
    (event) => event.photos
  )
  event: Event;

  @Column({ type: "boolean", default: false })
  is_deleted: boolean;
}
