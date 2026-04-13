import { Component, OnDestroy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminService } from 'src/app/core/services/admin.service';
import { SkillService, SkillResponse } from 'src/app/core/services/skill.service';
import { CacheService } from 'src/app/core/services/cache.service';
import { MatCard } from '@angular/material/card';

@Component({
  selector: 'app-manage-skills',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule,
    MatCard
  ],
  templateUrl: './skill-catalog.component.html',
  styleUrls: ['./skill-catalog.component.scss']
})
export class SkillCatalogComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private skillService = inject(SkillService);
  private cacheService = inject(CacheService);
  private snackBar     = inject(MatSnackBar);
  private destroy$     = new Subject<void>();

  skills = signal<SkillResponse[]>([]);

  totalSkills     = computed(() => this.skills().length);
  categoriesCount = computed(() => new Set(this.skills().map(s => s.category)).size);

  displayedColumns: string[] = ['skill', 'category', 'actions'];

  newSkill   = { name: '', category: '' };
  categories = ['Frontend', 'Backend', 'DevOps', 'Mobile', 'Data Science', 'UI/UX'];

  ngOnInit() {
    this.loadSkills();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSkills() {
    this.skillService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => this.skills.set([...data]),
      error: (err) => console.error('Failed to fetch skills:', err),
    });
  }

  onAddSkill() {
    if (!this.newSkill.name || !this.newSkill.category) return;
    this.adminService.addSkill(this.newSkill).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open('Skill added successfully', 'OK', { duration: 2000 });
        this.newSkill = { name: '', category: '' };
        // Bust the skills cache so loadSkills() fetches fresh data
        this.cacheService.invalidate('skills:all');
        this.loadSkills();
      },
      error: () => {
        this.snackBar.open('Failed to add skill. Please try again.', 'Close', { duration: 3000 });
      },
    });
  }

  onDelete(id: number) {
    if (!confirm('Delete this skill?')) return;
    this.adminService.deleteSkill(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open('Skill deleted successfully', 'OK', { duration: 2000 });
        // Bust the skills cache so loadSkills() fetches fresh data
        this.cacheService.invalidate('skills:all');
        this.loadSkills();
      },
      error: () => {
        this.snackBar.open('Failed to delete skill. It might be assigned to a mentor.', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar'],
        });
        this.loadSkills(); // re-sync UI in case local state is stale
      },
    });
  }
}
