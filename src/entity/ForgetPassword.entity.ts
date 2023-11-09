import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ForgotPassword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("varchar")
  email: string;

  @Column("varchar")
  otp: string;

  @Column({type: "timestamp"})
  otpExpiry: Date
}
