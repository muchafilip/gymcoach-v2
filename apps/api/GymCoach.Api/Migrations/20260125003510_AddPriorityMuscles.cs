using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymCoach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPriorityMuscles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserWorkoutPlanPriorityMuscles",
                columns: table => new
                {
                    UserWorkoutPlanId = table.Column<int>(type: "integer", nullable: false),
                    MuscleGroupId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserWorkoutPlanPriorityMuscles", x => new { x.UserWorkoutPlanId, x.MuscleGroupId });
                    table.ForeignKey(
                        name: "FK_UserWorkoutPlanPriorityMuscles_MuscleGroups_MuscleGroupId",
                        column: x => x.MuscleGroupId,
                        principalTable: "MuscleGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserWorkoutPlanPriorityMuscles_UserWorkoutPlans_UserWorkout~",
                        column: x => x.UserWorkoutPlanId,
                        principalTable: "UserWorkoutPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserWorkoutPlanPriorityMuscles_MuscleGroupId",
                table: "UserWorkoutPlanPriorityMuscles",
                column: "MuscleGroupId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserWorkoutPlanPriorityMuscles");
        }
    }
}
