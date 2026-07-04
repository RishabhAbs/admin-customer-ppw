import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

// Admin-set override for the "By Brand" / "By Category" home page tiles.
// Without a row here, the tile falls back to an auto-picked photo from any
// item in that group (see AppController.getGroupThumbnails).
@Entity('group_thumbnail')
@Unique(['group_type', 'group_name'])
export class GroupThumbnail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  group_type: 'brand' | 'category';

  @Column()
  group_name: string;

  @Column()
  image_url: string; // root-relative, e.g. '/api/media/items/000041img1.webp'

  @Column()
  source: 'item' | 'upload';

  @Column({ nullable: true })
  updated_by: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
