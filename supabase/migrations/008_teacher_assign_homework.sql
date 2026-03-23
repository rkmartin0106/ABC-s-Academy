-- Teachers need INSERT and UPDATE on student_assignments to assign homework
-- and update scores/status when grading.
-- The existing "Teachers can read all submissions" policy only covers SELECT.

create policy "Teachers can manage all submissions"
  on student_assignments for all
  using (get_my_role() = 'teacher');
