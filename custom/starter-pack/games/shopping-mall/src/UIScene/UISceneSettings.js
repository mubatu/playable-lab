// ui-settings.js
export const UISettings = {
    buttons: [
        {
            id: "download-btn",
            text: "PLAY NOW",
            styles: {
                // Positioning
                position: "absolute",
                bottom: "30px",
                left: "50%",
                transform: "translateX(-50%)",

                // Aesthetics
                padding: "15px 40px",
                fontSize: "24px",
                fontWeight: "bold",
                backgroundColor: "#ff5722",
                color: "#ffffff",
                border: "none",
                borderRadius: "30px",
                cursor: "pointer",
                boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",

                // Ensure it sits above the canvas
                zIndex: "10"
            },
            onClick: () => {
                window.open("https://www.google.com", "_blank");
                // Ad network redirect logic goes here
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