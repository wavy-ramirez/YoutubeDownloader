const fs = require("fs")
const ytdl = require("ytdl-core")
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path
const ffmpeg = require("fluent-ffmpeg")
ffmpeg.setFfmpegPath(ffmpegPath)
const { Worker, isMainThread, parentPort } = require("worker_threads");
const puppeteer = require("puppeteer")

async function DownloadVideo(url) {
    var title = "<UKNOWN>" 
    try{
        const info = (await ytdl.getInfo(url)).videoDetails
        title = info.title;
        const download = ytdl(url, {quality: "highestaudio"})
        
        await new Promise((resolve) => {
            const command = ffmpeg()
            .input(download)
            .format("mp3")
            .on("error", (err) => {
                console.log("FFMPEG ERROR: " + err)
            })
            .on("end", () => {
                console.log("Finished With Song: " + title)
                resolve();
            })
            .output(`./${info.title}.mp3`);
        
            command.run()
        })
        
    } catch (err) {
        console.log("Failed to Download Song.\n");
        console.log("Song: " + title + " --- " + url);
    }
}

// Make Sure Your Playlist is Public or unlisted
async function ScrapePlaylist(url){
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url);

    for (let i = 0; i < 15; i++) {
        for (let _ = 0; _ < 10; _++) {
            await page.keyboard.press("PageDown");
            await page.keyboard.press("PageDown");
            await page.keyboard.press("PageDown");
            await page.keyboard.press("PageDown");
            await page.keyboard.press("PageDown");
        }
        setTimeout(() => {}, 250)
    }

    let els = await page.$$eval("ytd-playlist-video-list-renderer a#thumbnail", (el) => el.map(val => val.href.split("&list=")[0]))
    
    await browser.close()

    return els
}

// ScrapePlaylist("https://www.youtube.com/playlist?list=PLBVdKHkTEH0c9v82odAIqlIz0u1Hn1qfj")
ScrapePlaylist("https://www.youtube.com/playlist?list=PLBVdKHkTEH0ebhb2RnEVCoPQg0XNJXhB9")

function splitPlaylist(playlist) {
    let final = []
    
    while(playlist.length) {
        final.push(playlist.splice(0, 20));
    }
    
    return final
}

async function DownloadPlaylist(url) { 
    if (isMainThread) {
        let playlist = await ScrapePlaylist(url)
        let splits = splitPlaylist(playlist)

        splits.forEach((value) => {
            let worker = new Worker(__dirname);
            worker.postMessage(value)
        })
    }
    else {
        parentPort.on("message", (value) => {
            console.log("Downloading Songs");

            value.forEach(async (val) => {
                try {
                    await DownloadVideo(val);
                } catch(err) {
                    console.log("Kys");
                }
            })

            parentPort.close()
        })
    }
}

DownloadPlaylist("https://www.youtube.com/playlist?list=PLBVdKHkTEH0ebhb2RnEVCoPQg0XNJXhB9")