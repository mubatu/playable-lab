
export class KickCommand {
    execute(targetPlayer) {
        if (targetPlayer) {
            targetPlayer.kick();
        }
    }
}