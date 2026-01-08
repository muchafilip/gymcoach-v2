using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymCoach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiWeekPlanSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DurationWeeks",
                table: "UserWorkoutPlans",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "UserWorkoutPlans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "DayTypeId",
                table: "UserWorkoutDays",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "WeekNumber",
                table: "UserWorkoutDays",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DurationWeeks",
                table: "UserWorkoutPlans");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "UserWorkoutPlans");

            migrationBuilder.DropColumn(
                name: "DayTypeId",
                table: "UserWorkoutDays");

            migrationBuilder.DropColumn(
                name: "WeekNumber",
                table: "UserWorkoutDays");
        }
    }
}
