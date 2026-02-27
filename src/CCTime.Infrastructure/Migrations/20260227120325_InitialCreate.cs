using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CCTime.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "clients",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    order_index = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_clients", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "rooms",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    order_index = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rooms", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "specialists",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    order_index = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_specialists", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "time_slots",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    type = table.Column<string>(type: "text", nullable: false),
                    order_index = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_time_slots", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "reserves",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    client_id = table.Column<Guid>(type: "uuid", nullable: false, defaultValue: new Guid("00000000-0000-0000-0000-000000000000")),
                    specialist_id = table.Column<Guid>(type: "uuid", nullable: false, defaultValue: new Guid("00000000-0000-0000-0000-000000000000")),
                    room_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    time_slot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    client_confirmed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    specialist_confirmed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reserves", x => x.id);
                    table.ForeignKey(
                        name: "FK_reserves_clients_client_id",
                        column: x => x.client_id,
                        principalTable: "clients",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reserves_rooms_room_id",
                        column: x => x.room_id,
                        principalTable: "rooms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reserves_specialists_specialist_id",
                        column: x => x.specialist_id,
                        principalTable: "specialists",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reserves_time_slots_time_slot_id",
                        column: x => x.time_slot_id,
                        principalTable: "time_slots",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "clients",
                columns: new[] { "id", "name" },
                values: new object[] { new Guid("00000000-0000-0000-0000-000000000001"), "-" });

            migrationBuilder.InsertData(
                table: "clients",
                columns: new[] { "id", "name", "order_index" },
                values: new object[,]
                {
                    { new Guid("b2c3d4e5-0002-0000-0000-000000000001"), "Клиент1", 1 },
                    { new Guid("b2c3d4e5-0002-0000-0000-000000000003"), "Клиент2", 2 }
                });

            migrationBuilder.InsertData(
                table: "rooms",
                columns: new[] { "id", "name", "order_index" },
                values: new object[,]
                {
                    { new Guid("c3d4e5f6-0003-0000-0000-000000000001"), "ЛОГО", 1 },
                    { new Guid("c3d4e5f6-0003-0000-0000-000000000002"), "НЕЙРО", 2 }
                });

            migrationBuilder.InsertData(
                table: "specialists",
                columns: new[] { "id", "name" },
                values: new object[] { new Guid("00000000-0000-0000-0000-000000000001"), "-" });

            migrationBuilder.InsertData(
                table: "specialists",
                columns: new[] { "id", "name", "order_index" },
                values: new object[,]
                {
                    { new Guid("a1b2c3d4-0001-0000-0000-000000000001"), "Специалист1", 1 },
                    { new Guid("a1b2c3d4-0001-0000-0000-000000000002"), "Специалист2", 2 }
                });

            migrationBuilder.InsertData(
                table: "time_slots",
                columns: new[] { "id", "name", "order_index", "type" },
                values: new object[,]
                {
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000001"), "8.30-9.15", 1, "work" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000002"), "9.15-10.00", 2, "work" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000003"), "10.00-10.45", 3, "work" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000004"), "перерыв 15 мин", 4, "break" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000005"), "11.00-11.45", 5, "work" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000006"), "11.45-12.30", 6, "work" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000007"), "12.30-13.15", 7, "work" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000008"), "обед", 8, "break" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000009"), "13.30-14.15", 9, "work" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000010"), "14.15-15.00", 10, "work" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000011"), "15.00-15.45", 11, "work" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000012"), "перерыв 15 мин", 12, "break" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000013"), "16.00-16.45", 13, "work" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000014"), "16.45-17.30", 14, "work" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000015"), "17.30-18.15", 15, "work" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000016"), "перерыв 15 мин", 16, "break" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000017"), "18.30-19.15", 17, "work" },
                    { new Guid("d4e5f6a7-0004-0000-0000-000000000018"), "19.15-20.00", 18, "work" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_reserves_client_id",
                table: "reserves",
                column: "client_id");

            migrationBuilder.CreateIndex(
                name: "IX_reserves_date_time_slot_id_room_id",
                table: "reserves",
                columns: new[] { "date", "time_slot_id", "room_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reserves_room_id",
                table: "reserves",
                column: "room_id");

            migrationBuilder.CreateIndex(
                name: "IX_reserves_specialist_id",
                table: "reserves",
                column: "specialist_id");

            migrationBuilder.CreateIndex(
                name: "IX_reserves_time_slot_id",
                table: "reserves",
                column: "time_slot_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "reserves");

            migrationBuilder.DropTable(
                name: "clients");

            migrationBuilder.DropTable(
                name: "rooms");

            migrationBuilder.DropTable(
                name: "specialists");

            migrationBuilder.DropTable(
                name: "time_slots");
        }
    }
}
