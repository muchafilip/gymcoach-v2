using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace GymCoach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "WeeklyGoalMetThisWeek",
                table: "UserProgress",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "Quests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    XpReward = table.Column<int>(type: "integer", nullable: false),
                    Icon = table.Column<string>(type: "text", nullable: false),
                    TargetType = table.Column<string>(type: "text", nullable: false),
                    TargetValue = table.Column<int>(type: "integer", nullable: false),
                    RequiredLevel = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Quests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserQuests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    QuestId = table.Column<int>(type: "integer", nullable: false),
                    Progress = table.Column<int>(type: "integer", nullable: false),
                    Completed = table.Column<bool>(type: "boolean", nullable: false),
                    Claimed = table.Column<bool>(type: "boolean", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastRefreshedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserQuests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserQuests_Quests_QuestId",
                        column: x => x.QuestId,
                        principalTable: "Quests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserQuests_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Quests",
                columns: new[] { "Id", "Code", "Description", "Icon", "IsActive", "RequiredLevel", "TargetType", "TargetValue", "Title", "Type", "XpReward" },
                values: new object[,]
                {
                    { 1, "daily_workout", "Finish any workout today", "💪", true, null, "workout_complete", 1, "Complete a Workout", 1, 50 },
                    { 2, "daily_sets_10", "Complete 10 sets in your workouts", "🔢", true, null, "sets_logged", 10, "Log 10 Sets", 1, 30 },
                    { 3, "daily_sets_20", "Complete 20 sets in your workouts", "📊", true, null, "sets_logged", 20, "Log 20 Sets", 1, 50 },
                    { 4, "daily_rest", "Log an intentional rest day", "😴", true, null, "rest_day", 1, "Take a Rest Day", 1, 20 },
                    { 5, "weekly_3_workouts", "Complete 3 workouts this week", "🗓️", true, null, "workouts_this_week", 3, "Train 3 Times", 2, 150 },
                    { 6, "weekly_5_workouts", "Complete 5 workouts this week", "🔥", true, null, "workouts_this_week", 5, "Train 5 Times", 2, 250 },
                    { 7, "weekly_pr", "Set a new personal record this week", "🏆", true, null, "pr_achieved", 1, "Hit a New PR", 2, 100 },
                    { 8, "weekly_sets_100", "Complete 100 sets this week", "💯", true, null, "sets_logged", 100, "Log 100 Sets", 2, 200 },
                    { 9, "first_workout", "Finish your very first workout", "🎯", true, null, "total_workouts", 1, "Complete Your First Workout", 3, 100 },
                    { 10, "subscribe_plan", "Subscribe to any workout plan", "📋", true, null, "plans_subscribed", 1, "Start a Workout Plan", 3, 75 },
                    { 11, "first_week", "Hit your weekly workout goal", "📅", true, null, "weeks_completed", 1, "Complete a Full Week", 3, 200 },
                    { 12, "workouts_10", "Reach 10 total workouts", "⭐", true, null, "total_workouts", 10, "Complete 10 Workouts", 4, 200 },
                    { 13, "workouts_50", "Reach 50 total workouts", "🌟", true, null, "total_workouts", 50, "Complete 50 Workouts", 4, 500 },
                    { 14, "workouts_100", "Reach 100 total workouts", "✨", true, null, "total_workouts", 100, "Complete 100 Workouts", 4, 1000 },
                    { 15, "streak_4", "Hit your weekly goal 4 weeks in a row", "🔥", true, null, "streak", 4, "4-Week Streak", 4, 150 },
                    { 16, "streak_12", "Hit your weekly goal 12 weeks in a row", "🔥🔥", true, null, "streak", 12, "12-Week Streak", 4, 500 },
                    { 17, "level_10", "Reach level 10", "🎖️", true, null, "level", 10, "Reach Level 10", 4, 300 },
                    { 18, "level_25", "Reach level 25", "🏅", true, null, "level", 25, "Reach Level 25", 4, 750 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserQuests_QuestId",
                table: "UserQuests",
                column: "QuestId");

            migrationBuilder.CreateIndex(
                name: "IX_UserQuests_UserId_QuestId_AssignedAt",
                table: "UserQuests",
                columns: new[] { "UserId", "QuestId", "AssignedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserQuests");

            migrationBuilder.DropTable(
                name: "Quests");

            migrationBuilder.DropColumn(
                name: "WeeklyGoalMetThisWeek",
                table: "UserProgress");
        }
    }
}
