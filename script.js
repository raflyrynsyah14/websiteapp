    document.addEventListener('DOMContentLoaded', async () => {
        const authButtonsContainer = document.getElementById('auth-buttons');
        try {
            const response = await fetch('/api/user-session');
            const data = await response.json();

            if (data.loggedIn) {
                // Jika pengguna sudah login, tampilkan tombol Dashboard dan Logout
                authButtonsContainer.innerHTML = `
                    <span class="font-semibold text-gray-700">Halo, ${data.name}</span>
                    <a href="/dashboard.html" class="bg-green-500 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-600">
                        My Dashboard
                    </a>
                    <a href="/logout.html" class="text-gray-600 hover:text-blue-600">Logout</a>
                `;
            } 
            // Jika tidak login, tombol default (Booking/Login) akan tetap ada.
        } catch (error) {
            console.error("Gagal memeriksa sesi login:", error);
        }
    });