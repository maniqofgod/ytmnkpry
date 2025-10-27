const { spawn } = require('child_process');
const fs = require('fs');

function mergeAudioAndVideo(videoPath, audioPath, outputPath) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-i', videoPath,
            '-i', audioPath,
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-strict', 'experimental',
            outputPath
        ]);

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log('Penggabungan audio dan video berhasil.');
                resolve(outputPath);
            } else {
                console.error(`Proses FFmpeg keluar dengan kode ${code}`);
                reject(new Error(`Proses FFmpeg keluar dengan kode ${code}`));
            }
        });

        ffmpeg.stderr.on('data', (data) => {
            console.error(`stderr FFmpeg: ${data}`);
        });

        ffmpeg.on('error', (err) => {
            console.error('Gagal memulai proses FFmpeg:', err);
            reject(err);
        });
    });
}

module.exports = {
    mergeAudioAndVideo
};