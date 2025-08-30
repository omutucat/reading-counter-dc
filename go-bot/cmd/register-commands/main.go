package main

import (
	"fmt"
	"log"
	"os"

	"github.com/bwmarrin/discordgo"
	"github.com/omutucat/reading-counter-dc/go-bot/internal/commands"
)

func main() {
	// .envファイルなどから設定を読み込むことを想定
	botToken := os.Getenv("DISCORD_BOT_TOKEN")
	appID := os.Getenv("DISCORD_APP_ID")
	guildID := os.Getenv("DISCORD_GUILD_ID") // 特定のサーバーのみに登録する場合

	if botToken == "" || appID == "" {
		log.Fatal("DISCORD_BOT_TOKEN and DISCORD_APP_ID must be set")
	}

	s, err := discordgo.New("Bot " + botToken)
	if err != nil {
		log.Fatalf("Invalid bot parameters: %v", err)
	}

	fmt.Println("Registering commands...")
	// internal/commands/commands.go で定義したコマンド情報をループして登録
	registeredCommands, err := s.ApplicationCommandBulkOverwrite(appID, guildID, commands.All)
	if err != nil {
		log.Fatalf("Could not register commands: %v", err)
	}

	fmt.Printf("Successfully registered %d commands.\n", len(registeredCommands))
}
