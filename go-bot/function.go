package function

import (
	"bytes"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/bwmarrin/discordgo"
)

var (
	discordAppPubKey ed25519.PublicKey
)

// init() はCloud Functionのコールドスタート時に一度だけ実行され、環境変数を読み込みます。
func init() {
	pubKeyHex := os.Getenv("DISCORD_APP_PUBLIC_KEY")
	if pubKeyHex == "" {
		log.Fatal("DISCORD_APP_PUBLIC_KEY must be set")
	}

	key, err := hex.DecodeString(pubKeyHex)
	if err != nil {
		log.Fatalf("Failed to decode public key: %v", err)
	}
	discordAppPubKey = key
}

// HandleInteraction は、Cloud Functionのエントリーポイントとして登録するHTTPハンドラ関数です。
func HandleInteraction(w http.ResponseWriter, r *http.Request) {
	// リクエストが本当にDiscordから来たものか、署名を検証します。
	if !verifySignature(r) {
		log.Println("Invalid signature")
		http.Error(w, "invalid signature", http.StatusUnauthorized)
		return
	}

	// リクエストボディをデコードします。
	var interaction discordgo.Interaction
	if err := json.NewDecoder(r.Body).Decode(&interaction); err != nil {
		log.Printf("Error decoding interaction: %v", err)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// DiscordからのPing-Pongチェックに応答します。
	if interaction.Type == discordgo.InteractionPing {
		writeJSON(w, discordgo.InteractionResponse{
			Type: discordgo.InteractionResponsePong,
		})
		return
	}

	// スラッシュコマンドの実行に応答します。
	if interaction.Type == discordgo.InteractionApplicationCommand {
		data := interaction.ApplicationCommandData()
		// コマンド名によって処理を分岐します。
		switch data.Name {
		case "ping":
			handlePing(w, &interaction)
		default:
			log.Printf("Unknown command: %s", data.Name)
		}
	}
}

// /ping コマンドの具体的な処理です。
func handlePing(w http.ResponseWriter, _ *discordgo.Interaction) {
	// "Pong!" というメッセージを返します。
	writeJSON(w, discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: "Pong!",
		},
	})
}

// --- 以下はヘルパー関数です --- //

func verifySignature(r *http.Request) bool {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading body for verification: %v", err)
		return false
	}
	// 一度読んだボディを再度リクエストにセットし直します。
	r.Body = io.NopCloser(bytes.NewBuffer(body))

	return discordgo.VerifyInteraction(r, discordAppPubKey)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("Error encoding json: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
	}
}
