package backend

import (
	"fmt"
	"net/http"
	"os"
	"github.com/joho/godotenv"
)

func StartServer() {

	// Load .env file if present
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("Starting backend server on port %s...\n", port)

	mux := http.NewServeMux()
	// Dashboard page (must be registered before /)
	mux.HandleFunc("/dashboard", HandleMainPage)
	mux.HandleFunc("/dashboard/", HandleMainPage)
	// Main page
	mux.HandleFunc("/", HandleMainPage)
	// Player endpoints
	mux.HandleFunc("/api/player/add", AddPlayer)
	mux.HandleFunc("/api/player/edit", EditPlayer)
	mux.HandleFunc("/api/player/remove", RemovePlayer)
	mux.HandleFunc("/api/player/list", ListPlayers)
	// Team endpoints
	mux.HandleFunc("/api/team/add", AddTeam)
	mux.HandleFunc("/api/team/edit", EditTeam)
	mux.HandleFunc("/api/team/remove", RemoveTeam)
	mux.HandleFunc("/api/team/list", ListTeams)
	mux.HandleFunc("/api/team/assign", AssignPlayersToTeam)
	mux.HandleFunc("/api/team/players", ListPlayersByTeam)
	// Match endpoints
	mux.HandleFunc("/api/match/add", AddMatch)
	mux.HandleFunc("/api/match/edit", EditMatch)
	mux.HandleFunc("/api/match/remove", RemoveMatch)
	mux.HandleFunc("/api/match/list", ListMatches)
	mux.HandleFunc("/api/matches", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			AddMatch(w, r)
			return
		}
		// Handle other methods (GET, etc.) if needed
	})
	// Score endpoint
	mux.HandleFunc("/api/score/submit", SubmitScore)
	// Dashboard
	mux.HandleFunc("/api/dashboard", Dashboard)
	// Match score endpoints
	mux.HandleFunc("/api/match/score", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			SubmitMatchScore(w, r)
			return
		}
		if r.Method == http.MethodGet {
			GetMatchScore(w, r)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	})
	// Hole score endpoints
	mux.HandleFunc("/api/match/holescore", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			SaveHoleResults(w, r)
			return
		}
		if r.Method == http.MethodGet {
			LoadHoleResults(w, r)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	})
	// Match status endpoint
	mux.HandleFunc("/api/match/status", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			SetMatchStatus(w, r)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	})

	addr := ":" + port
	if err := http.ListenAndServe(addr, mux); err != nil {
		fmt.Printf("Server failed to start: %v\n", err)
	}

}
