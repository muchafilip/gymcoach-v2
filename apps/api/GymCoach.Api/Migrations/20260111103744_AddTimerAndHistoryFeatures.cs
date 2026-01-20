using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GymCoach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTimerAndHistoryFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DurationSeconds",
                table: "UserWorkoutDays",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAt",
                table: "UserWorkoutDays",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WeightUnit",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "ExercisePerformanceHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    ExerciseId = table.Column<int>(type: "integer", nullable: false),
                    UserWorkoutDayId = table.Column<int>(type: "integer", nullable: false),
                    TotalSets = table.Column<int>(type: "integer", nullable: false),
                    TotalReps = table.Column<int>(type: "integer", nullable: false),
                    MaxWeight = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    TotalVolume = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    PerformedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExercisePerformanceHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExercisePerformanceHistories_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExercisePerformanceHistories_UserWorkoutDays_UserWorkoutDay~",
                        column: x => x.UserWorkoutDayId,
                        principalTable: "UserWorkoutDays",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExercisePerformanceHistories_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExercisePerformanceHistories_ExerciseId",
                table: "ExercisePerformanceHistories",
                column: "ExerciseId");

            migrationBuilder.CreateIndex(
                name: "IX_ExercisePerformanceHistories_UserId_ExerciseId_PerformedAt",
                table: "ExercisePerformanceHistories",
                columns: new[] { "UserId", "ExerciseId", "PerformedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ExercisePerformanceHistories_UserWorkoutDayId",
                table: "ExercisePerformanceHistories",
                column: "UserWorkoutDayId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExercisePerformanceHistories");

            migrationBuilder.DropColumn(
                name: "DurationSeconds",
                table: "UserWorkoutDays");

            migrationBuilder.DropColumn(
                name: "StartedAt",
                table: "UserWorkoutDays");

            migrationBuilder.DropColumn(
                name: "WeightUnit",
                table: "Users");
        }
    }
}
