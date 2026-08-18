import axios from 'axios';
import QRCode from 'qrcode';

const pluginConfig = {
    name: 'topupml',
    alias: ['topupsaweria', 'topup'],
    category: 'store',
    description: 'Topup Diamond Mobile Legends via Saweria',
    usage: '.topupml <id> <zone>',
    example: '.topupml 1320801956 15437',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 2, // Sesuaikan konsumsi energi di bot lu
    isEnabled: true
}

class SaweriaAutomation {
    constructor(username = 'Rulzxxyz') {
        this.username = username;
        this.streamerId = '235d5a61e0e8e0caca8155afd0179770'; 
        
        this.backend = axios.create({
            baseURL: 'https://backend.saweria.co',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                'Origin': 'https://saweria.co',
                'Referer': `https://saweria.co/${this.username}/toko-top-up/mobile-legends-bang-bang`
            },
            timeout: 15000
        });
    }

    async getProducts(gameSlug = 'mobile-legends-bang-bang') {
        const res = await this.backend.get(`/game-vouchers/${gameSlug}`, {
            params: { streamer_id: this.streamerId, username: this.username }
        });
        return res.data.data.game_vouchers.products
            .filter(p => p.status === 'ACTIVE')
            .map(p => ({
                id: p.product_id,
                sku: p.sku,                 
                name: p.product_name,
                slug: p.slug,
                sellingPrice: Number(p.pricing.selling_price),
                donationAmount: Number(p.donation_amount),
                thumbnail: p.image.thumbnail,
                vat: p.vat?.rate || 0       
            }));
    }

    async calculateFee(amount, paymentType = 'qris', message = 'pesanan') {
        const res = await this.backend.post(
            `/game-vouchers/${this.username}/calculate_pg_amount`,
            { amount: Number(amount), payment_type: paymentType, message: String(message) }
        );
        return res.data.data;
    }

    async createOrder({ product, userId, zoneId, donatorEmail, donatorName, message }) {
        const feeData = await this.calculateFee(product.sellingPrice, 'qris', message);

        const payload = {
            product_id: product.id,
            product_sku: String(product.sku),
            amount: Number(product.sellingPrice),
            payment_type: 'qris',
            vat: product.vat,
            vatAmount: feeData.vat_amount || 0,
            message: String(message),
            digital_form: [
                { key: "userId", value: String(userId) },
                { key: "zoneId", value: String(zoneId) }
            ],
            customer_info: {
                first_name: String(donatorName).trim(),
                email: String(donatorEmail).trim(),
                phone: ""
            }
        };

        try {
            const res = await this.backend.post(`/game-vouchers/snap/${this.streamerId}`, payload);
            return {
                orderId: res.data.data.id,
                amount: res.data.data.amount,
                status: res.data.data.status,
                qrString: res.data.data.etc.qr_string,
                expiredAt: res.data.data.etc.payment_expired_at,
                productName: res.data.data.etc.game_voucher.product_name
            };
        } catch (err) {
            throw new Error(`Gagal buat order: ${err.response?.statusText || err.message}`);
        }
    }

    formatWaktu(dateString, pakaiPukul = false) {
        const date = new Date(dateString);
        const bulanArr = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
        const bulanArrFull = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        
        const tgl = date.getDate();
        const bln = pakaiPukul ? bulanArrFull[date.getMonth()] : bulanArr[date.getMonth()];
        const thn = date.getFullYear();
        const jam = String(date.getHours()).padStart(2, '0');
        const mnt = String(date.getMinutes()).padStart(2, '0');

        if (pakaiPukul) return `${tgl} ${bln} ${thn} pukul ${jam}.${mnt} WIB`;
        return `${tgl} ${bln} ${thn}, ${jam}.${mnt} WIB`;
    }

    hitungSisaWaktu(expiredString) {
        const expired = new Date(expiredString).getTime();
        const sekarang = new Date().getTime();
        const selisih = expired - sekarang;
        if (selisih <= 0) return "Kedaluwarsa";
        const menit = Math.floor(selisih / (1000 * 60));
        const detik = Math.floor((selisih % (1000 * 60)) / 1000);
        return `${menit}m ${detik}d`;
    }

    async generateQRBuffer(qrString) {
        return await QRCode.toBuffer(qrString, {
            color: { dark: '#000000', light: '#FFFFFF' },
            width: 400,
            margin: 2
        });
    }

    async trackOrder(orderId) {
        try {
            const res = await this.backend.get(`/game-vouchers/tracking-order/${orderId}`);
            const data = res.data.data;

            const berlakuHingga = this.formatWaktu(data.expired_at, true);
            const tanggalDibuat = this.formatWaktu(data.created_at, false);
            
            let tanggalDiselesaikan = "-";
            let statusPengiriman = "Belum Diproses";

            if (data.status === 'SUCCESS' || data.payment_status === 'PAID' || data.payment_status === 'SETTLED') {
                statusPengiriman = "Berhasil";
                tanggalDiselesaikan = this.formatWaktu(data.payment_updated_at, false);
            }

            let outputText = `*DETAIL PESANAN SAWERIA*\n\n`;
            outputText += `⏱️ Berlaku Hingga: ${berlakuHingga}\n`;
            outputText += `⏳ Sisa Waktu: ${this.hitungSisaWaktu(data.expired_at)}\n\n`;
            outputText += `💸 Dukungan untuk ${data.username}: Rp${data.amount_raw.toLocaleString('id-ID')}\n`;
            outputText += `🧾 ID: ${data.id}\n\n`;
            outputText += `*Detail Transaksi*\n`;
            outputText += `📦 Status pengiriman: ${statusPengiriman}\n`;
            outputText += `📅 Tanggal dibuat: ${tanggalDibuat}\n`;
            outputText += `✅ Tanggal diselesaikan: ${tanggalDiselesaikan}`;

            if (data.etc && data.etc.qr_string) {
                const qrBuffer = await this.generateQRBuffer(data.etc.qr_string);
                return { success: true, text: outputText, qrBuffer: qrBuffer, data };
            } else {
                return { success: false, text: outputText, message: "QR String tidak ada", data };
            }
        } catch (err) {
            return { success: false, message: err.message };
        }
    }
}

async function handler(m, { sock, args }) {
    try {
        // Ambil argumen dari pesan. Kalau args kosong, kita parse manual dari m.text
        let inputArgs = args;
        if (!inputArgs || inputArgs.length === 0) {
             const textMsg = m.text || m.body || "";
             inputArgs = textMsg.trim().split(/ +/).slice(1);
        }

        if (inputArgs.length < 2) {
            return await m.reply(`*Format Salah!*\n\nContoh penggunaan:\n${pluginConfig.example}`);
        }

        const userId = inputArgs[0];
        const zoneId = inputArgs[1];

        await m.reply('🔍 Sedang memproses pesanan ke Saweria...');

        const scraper = new SaweriaAutomation('RulzxXyz'); // Pastikan username sesuai (zixvorx atau Rulzxxyz)

        const products = await scraper.getProducts();
        if (!products || products.length === 0) {
            return await m.reply('❌ Produk tidak ditemukan atau sedang tidak aktif.');
        }

        const product = products[0]; 
        
        const orderInfo = {
            product: product,
            userId: userId,
            zoneId: zoneId,
            donatorEmail: 'rulminecraft873@gmail.com', 
            donatorName: m.pushName || 'RulzxXyz', 
            message: `Pesanan MLBB - ${userId}(${zoneId})`
        };

        const order = await scraper.createOrder(orderInfo);
        const trackResult = await scraper.trackOrder(order.orderId);

        if (trackResult.success) {
            // Karena template lu pakai { sock }, gw pake sock.sendMessage
            await sock.sendMessage(m.key.remoteJid || m.chat, { 
                image: trackResult.qrBuffer, 
                caption: `${trackResult.text}\n\n💡 *Silakan scan QRIS di atas menggunakan e-wallet kamu.*`
            }, { quoted: m });
        } else {
            await m.reply(`⚠️ Gagal mendapatkan QRIS.\n\nKeterangan: ${trackResult.message}`);
        }

    } catch (error) {
        console.error('Topup Plugin Error:', error)
        await m.reply('❌ *GAGAL*\n\n> ' + error.message)
    }
}

export { pluginConfig as config, handler }