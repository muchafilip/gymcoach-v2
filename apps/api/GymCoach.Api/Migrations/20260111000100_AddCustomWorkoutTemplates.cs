using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GymCoach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomWorkoutTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "WorkoutTemplates",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CustomTemplateExercises",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorkoutDayTemplateId = table.Column<int>(type: "integer", nullable: false),
                    ExerciseId = table.Column<int>(type: "integer", nullable: false),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false),
                    Sets = table.Column<int>(type: "integer", nullable: false),
                    TargetReps = table.Column<int>(type: "integer", nullable: false),
                    DefaultWeight = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomTemplateExercises", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CustomTemplateExercises_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CustomTemplateExercises_WorkoutDayTemplates_WorkoutDayTempl~",
                        column: x => x.WorkoutDayTemplateId,
                        principalTable: "WorkoutDayTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "WorkoutTemplates",
                keyColumn: "Id",
                keyValue: 1,
                column: "UserId",
                value: null);

            migrationBuilder.UpdateData(
                table: "WorkoutTemplates",
                keyColumn: "Id",
                keyValue: 2,
                column: "UserId",
                value: null);

            migrationBuilder.UpdateData(
                table: "WorkoutTemplates",
                keyColumn: "Id",
                keyValue: 3,
                column: "UserId",
                value: null);

            migrationBuilder.UpdateData(
                table: "WorkoutTemplates",
                keyColumn: "Id",
                keyValue: 4,
                column: "UserId",
                value: null);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutTemplates_UserId",
                table: "WorkoutTemplates",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomTemplateExercises_ExerciseId",
                table: "CustomTemplateExercises",
                column: "ExerciseId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomTemplateExercises_WorkoutDayTemplateId",
                table: "CustomTemplateExercises",
                column: "WorkoutDayTemplateId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkoutTemplates_Users_UserId",
                table: "WorkoutTemplates",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkoutTemplates_Users_UserId",
                table: "WorkoutTemplates");

            migrationBuilder.DropTable(
                name: "CustomTemplateExercises");

            migrationBuilder.DropIndex(
                name: "IX_WorkoutTemplates_UserId",
                table: "WorkoutTemplates");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "WorkoutTemplates");
        }
    }
}
