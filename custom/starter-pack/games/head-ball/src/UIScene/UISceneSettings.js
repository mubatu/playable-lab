import {KickCommand} from "../Command/KickCommand";

export const UISettings = {
    buttons: [
        {
            id: "invisible-kick-zone",
            text: "",
            styles: {
                position: "absolute",
                bottom: "0",
                right: "0",
                width: "50%",     // Covers the entire right half of the screen
                height: "100%",   // Covers top to bottom
                backgroundColor: "transparent", // Completely invisible!
                border: "none",
                outline: "none",
                zIndex: "10",
                pointerEvents: "auto"
                // Tip: Temporarily change transparent to "rgba(255, 0, 0, 0.2)" to see it while debugging
            },
            onInit: () => {
                // Initialize the command globally so the UI can use it
                window.kickCommand = new KickCommand();
            },
            onClick: () => {
                // Fire the command at the globally referenced player
                if (window.kickCommand && window.player1) {
                    window.kickCommand.execute(window.player1);
                }
            }
        }
    ],
    joysticks: [
        {
            id: "movement-joystick",
            maxRadius: 60,
            styles: {
                bottom: "50px",
                left: "50px",
                zIndex: "10"
            },
            // Capture the command reference when the joystick is built
            onInit: (commandInstance) => {
                window.playerMovementCommand = commandInstance;
                // Or store it in a dedicated GameManager/InputManager
            }
        }
    ]
};