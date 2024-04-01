const fs = require('fs');
const { get_player_uuid } = require(`${process.cwd()}/utils/get_player_info.js`);

async function getPlayerRole(player_uuid) {
    if (player_uuid == 'Not Found') return player_uuid;

    const config = fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8');

    for (const item of config.admin) {
        if (get_player_uuid(item) == player_uuid) {
            return 'admin';
        } else {
            return 'none';
        }
    }
}



module.exports = {
    getPlayerRole
};