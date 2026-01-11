using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace GymCoach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAdvancedWorkoutFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SupersetGroupId",
                table: "UserExerciseLogs",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupersetOrder",
                table: "UserExerciseLogs",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ActualDurationSeconds",
                table: "ExerciseSets",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DurationSeconds",
                table: "ExerciseSets",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RepSchemeId",
                table: "ExerciseSets",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DefaultRole",
                table: "Exercises",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Exercises",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "RepSchemes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    MinReps = table.Column<int>(type: "integer", nullable: true),
                    MaxReps = table.Column<int>(type: "integer", nullable: true),
                    TargetSets = table.Column<int>(type: "integer", nullable: true),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true),
                    RestSeconds = table.Column<int>(type: "integer", nullable: true),
                    Configuration = table.Column<string>(type: "text", nullable: true),
                    IsSystem = table.Column<bool>(type: "boolean", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RepSchemes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RepSchemes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SupersetTemplates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    IsAntagonist = table.Column<bool>(type: "boolean", nullable: false),
                    MuscleGroupAId = table.Column<int>(type: "integer", nullable: false),
                    MuscleGroupBId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupersetTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupersetTemplates_MuscleGroups_MuscleGroupAId",
                        column: x => x.MuscleGroupAId,
                        principalTable: "MuscleGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SupersetTemplates_MuscleGroups_MuscleGroupBId",
                        column: x => x.MuscleGroupBId,
                        principalTable: "MuscleGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserSupersets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExerciseLogAId = table.Column<int>(type: "integer", nullable: false),
                    ExerciseLogBId = table.Column<int>(type: "integer", nullable: false),
                    IsManual = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSupersets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserSupersets_UserExerciseLogs_ExerciseLogAId",
                        column: x => x.ExerciseLogAId,
                        principalTable: "UserExerciseLogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserSupersets_UserExerciseLogs_ExerciseLogBId",
                        column: x => x.ExerciseLogBId,
                        principalTable: "UserExerciseLogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 1, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 1, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 1, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 10,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 11,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 13,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 14,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 15,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 1, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 16,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 17,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 18,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 19,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 20,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 1, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 21,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 22,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 23,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 24,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 25,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 26,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 27,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 28,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 1, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 29,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 30,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 31,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 1, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 32,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 33,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 34,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 35,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 1, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 36,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 37,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 38,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 39,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 40,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 41,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 42,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 2, 1 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 43,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 44,
                columns: new[] { "DefaultRole", "Type" },
                values: new object[] { 3, 2 });

            migrationBuilder.InsertData(
                table: "RepSchemes",
                columns: new[] { "Id", "Configuration", "DurationSeconds", "IsSystem", "MaxReps", "MinReps", "Name", "RestSeconds", "TargetSets", "Type", "UserId" },
                values: new object[,]
                {
                    { 1, null, null, true, 3, 1, "Power", 180, 5, 1, null },
                    { 2, null, null, true, 6, 4, "Strength", 150, 4, 2, null },
                    { 3, null, null, true, 12, 8, "Hypertrophy", 90, 3, 3, null },
                    { 4, null, null, true, 20, 15, "Muscular Endurance", 60, 3, 4, null },
                    { 5, null, null, true, 50, 20, "Cardio/HIIT", 30, 2, 5, null },
                    { 6, null, 60, true, null, null, "EMOM", null, 10, 100, null },
                    { 7, null, 60, true, null, null, "AMRAP", null, 1, 101, null },
                    { 8, null, 30, true, null, null, "Timed Set", 60, 3, 102, null }
                });

            migrationBuilder.InsertData(
                table: "SupersetTemplates",
                columns: new[] { "Id", "IsAntagonist", "MuscleGroupAId", "MuscleGroupBId", "Name" },
                values: new object[,]
                {
                    { 1, true, 1, 2, "Chest + Back" },
                    { 2, true, 4, 5, "Biceps + Triceps" },
                    { 3, true, 6, 7, "Quads + Hamstrings" },
                    { 4, true, 3, 2, "Shoulders + Back" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExerciseSets_RepSchemeId",
                table: "ExerciseSets",
                column: "RepSchemeId");

            migrationBuilder.CreateIndex(
                name: "IX_RepSchemes_UserId",
                table: "RepSchemes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SupersetTemplates_MuscleGroupAId",
                table: "SupersetTemplates",
                column: "MuscleGroupAId");

            migrationBuilder.CreateIndex(
                name: "IX_SupersetTemplates_MuscleGroupBId",
                table: "SupersetTemplates",
                column: "MuscleGroupBId");

            migrationBuilder.CreateIndex(
                name: "IX_UserSupersets_ExerciseLogAId",
                table: "UserSupersets",
                column: "ExerciseLogAId");

            migrationBuilder.CreateIndex(
                name: "IX_UserSupersets_ExerciseLogBId",
                table: "UserSupersets",
                column: "ExerciseLogBId");

            migrationBuilder.AddForeignKey(
                name: "FK_ExerciseSets_RepSchemes_RepSchemeId",
                table: "ExerciseSets",
                column: "RepSchemeId",
                principalTable: "RepSchemes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExerciseSets_RepSchemes_RepSchemeId",
                table: "ExerciseSets");

            migrationBuilder.DropTable(
                name: "RepSchemes");

            migrationBuilder.DropTable(
                name: "SupersetTemplates");

            migrationBuilder.DropTable(
                name: "UserSupersets");

            migrationBuilder.DropIndex(
                name: "IX_ExerciseSets_RepSchemeId",
                table: "ExerciseSets");

            migrationBuilder.DropColumn(
                name: "SupersetGroupId",
                table: "UserExerciseLogs");

            migrationBuilder.DropColumn(
                name: "SupersetOrder",
                table: "UserExerciseLogs");

            migrationBuilder.DropColumn(
                name: "ActualDurationSeconds",
                table: "ExerciseSets");

            migrationBuilder.DropColumn(
                name: "DurationSeconds",
                table: "ExerciseSets");

            migrationBuilder.DropColumn(
                name: "RepSchemeId",
                table: "ExerciseSets");

            migrationBuilder.DropColumn(
                name: "DefaultRole",
                table: "Exercises");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Exercises");
        }
    }
}
