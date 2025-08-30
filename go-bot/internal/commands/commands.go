package commands

import "github.com/bwmarrin/discordgo"

// All は、このBotで定義されるすべてのコマンドの定義を保持します。
var All = []*discordgo.ApplicationCommand{
	{
		Name:        "ping",
		Description: "Botの疎通確認をします",
	},
	{
		Name:        "hello",
		Description: "元気に挨拶をします！",
	},
}
