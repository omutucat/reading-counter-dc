// go-bot/cmd/local-server/main.go
package main

import (
	"log"
	"net/http"

	function "github.com/omutucat/reading-counter-dc/go-bot"
)

func main() {
	port := "8080"
	http.HandleFunc("/", function.HandleInteraction) // ルートパスでHandleInteractionを呼び出す

	log.Printf("Starting local server on :%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Could not start server: %s\n", err)
	}
}
