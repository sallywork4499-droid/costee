# Costee – Sổ chi tiêu cá nhân

Ghi chi tiêu trong vài giây, xem báo cáo mỗi ngày và giữ ngân sách. Dữ liệu được lưu trong **Google Sheet của bạn**.

**Mở app:** link Vercel của project `costee` (Vercel → project costee → Domains).

## Cách app hoạt động

```
Điện thoại / máy tính
  └─ App Costee (HTML/CSS/JS tĩnh, deploy trên Vercel)
       ├─ Lưu tạm trên máy → ghi được cả khi mất mạng
       └─ Gửi/nhận dữ liệu ──► Google Apps Script (URL /exec + mã bí mật)
                                   └─► Google Sheet của bạn
                                        ├─ tab Costee_GiaoDich (các khoản chi)
                                        └─ tab Costee_CaiDat (ngân sách, hạn mức, hạng mục)
```

- **Code** nằm trên GitHub. **Dữ liệu** chỉ nằm trong Google Sheet (không có trong repo).
- Không có server riêng, không cần build, không cần biến môi trường.

## Tính năng

| | So với cách ghi trên Google Sheet trước đây |
|---|---|
| ⚡ **Ghi nhanh**: gõ `45` = 45.000₫, `1.2tr` = 1.200.000₫; hạng mục hay dùng tự lên đầu; gợi ý ghi chú cũ | Không phải mở sheet, cuộn xuống cuối, gõ ngày, chọn hạng mục |
| 🎯 **Mức được chi hôm nay** = (ngân sách tháng − khoản cố định − đã chi) ÷ số ngày còn lại, tự cập nhật | Trước đây phải tự viết công thức `=G/27` mỗi tháng |
| 🚦 **Hạn mức theo nhóm** (Ăn uống, Coffee học bài, Quần áo & mỹ phẩm…) có cảnh báo ✓ Ổn / ⚠ Sắp hết / ✕ Vượt | Trước đây phải chép lại bảng `SUMIF` cho từng tháng |
| 🔮 **Dự báo cuối tháng**: cảnh báo sớm nếu đang chi quá tay | Chưa có |
| 📊 **Báo cáo** theo tuần / tháng / năm: biểu đồ theo ngày, theo hạng mục, so sánh với kỳ trước, xu hướng 12 tháng, 5 khoản lớn nhất, nhận xét tự động | Chưa có |
| 🌱 **"Để dành"**: ghi lại món đã định mua mà không mua hoặc đã trả hàng (giống cột *"Đã tiết kiệm không mua linh tinh"*) | Có, nhưng phải cộng tay |
| 📱 Dùng như app trên điện thoại, **vẫn ghi được khi mất mạng** (tự gửi lên khi có mạng lại) | |
| 🔍 Lịch sử: tìm kiếm, lọc, sửa, xoá; xuất CSV | |

## Deploy lên Vercel

1. Vercel → **Add New → Project** → chọn repo `costee` → **Import**.
2. **Framework Preset:** `Other` · **Build Command:** để trống · **Output Directory:** để trống · không cần Environment Variables.
3. **Deploy**. Mỗi lần push lên `main`, Vercel tự deploy lại.

> Cách khác: GitHub Pages (Settings → Pages → Branch `main`, thư mục `/ (root)`) hoặc bất kỳ hosting tĩnh nào.

## Kết nối Google Sheet (làm 1 lần, khoảng 5 phút)

App không sửa tab cũ của bạn. Nó tạo thêm 2 tab: `Costee_GiaoDich` (các khoản chi) và `Costee_CaiDat` (ngân sách, hạn mức, hạng mục).

1. Mở Google Sheet chi tiêu → menu **Tiện ích mở rộng → Apps Script**.
2. Xoá đoạn code mẫu, dán **toàn bộ** nội dung file [`apps-script/Code.gs`](apps-script/Code.gs), rồi bấm 💾 **Lưu**.
3. Quay lại Google Sheet và **tải lại trang** (F5). Trên thanh menu sẽ có thêm mục **Costee**.
4. Bấm **Costee → 1. Khởi tạo & lấy mã bí mật**. Lần đầu, Google sẽ hỏi cấp quyền: chọn tài khoản → *Nâng cao* → *Đi tới… (không an toàn)* → *Cho phép*. Đây là script do chính bạn tạo nên Google cảnh báo như vậy. Chép lại **mã bí mật** hiện ra.
5. Quay lại Apps Script → **Triển khai (Deploy) → Tùy chọn triển khai mới (New deployment)** → bấm ⚙ chọn **Ứng dụng web (Web app)**:
   - *Thực thi dưới dạng*: **Tôi**
   - *Người có quyền truy cập*: **Bất kỳ ai (Anyone)**
   - Bấm **Triển khai** rồi chép **URL ứng dụng web** (dạng `https://script.google.com/macros/s/…/exec`).
6. Mở app (link Vercel) → tab **Cài đặt** ở thanh dưới cùng của app → dán URL và mã bí mật → **Kết nối**.
7. Bấm **Nhập dữ liệu cũ từ tab "1. Chi tiêu"** để đưa toàn bộ lịch sử vào app. Bước này chạy lại được nhiều lần mà không bị trùng.

> 🔒 Chỉ ai có **cả URL lẫn mã bí mật** mới đọc hoặc ghi được dữ liệu. Không chia sẻ hai thứ này. Nếu lộ, vào **Costee → Đổi mã bí mật mới**.

> Khi sửa `Code.gs` sau này: **Triển khai → Quản lý các lần triển khai → ✏ → Phiên bản: Mới**. Làm vậy thì URL giữ nguyên.

### Gỡ lỗi kết nối

- **"Failed to fetch" / "Không gọi được Apps Script"**: mở URL `/exec` trong cửa sổ ẩn danh. Nếu ra trang đăng nhập Google → vào **Quản lý các lần triển khai → ✏ → Người có quyền truy cập: Bất kỳ ai** (không phải "Bất kỳ ai có tài khoản Google") → **Phiên bản mới → Triển khai**. URL phải kết thúc bằng `/exec`, không phải `/dev`.
- **"Sai mã bí mật"**: xem lại mã ở menu **Costee → Xem lại mã bí mật**.
- Tài khoản Google công ty/trường học có thể bị chặn tuỳ chọn "Bất kỳ ai" → dùng Gmail cá nhân.

### Nhập dữ liệu cũ hoạt động thế nào

- Đọc các cột *Ngày, Nội dung, Hạng mục, Số tiền* của tab `1. Chi tiêu`. Số thứ tự được bỏ khỏi tên hạng mục (`1. Tiền ăn` → `Tiền ăn`).
- Các số nhập tay ở cột E (vùng *"Đã tiết kiệm không mua linh tinh"*) được nhập thành khoản **🌱 Để dành**, kèm ghi chú ở cột F.
- Dòng không ghi ngày sẽ lấy ngày của dòng phía trên, và ghi chú có thêm *"(sheet cũ không ghi ngày)"* để bạn dễ tìm và sửa lại.
- Dòng không có số tiền (ô tổng, ghi chú…) được bỏ qua.

## Cài lên điện thoại

- **iPhone (Safari):** mở link → nút Chia sẻ → **Thêm vào MH chính**.
- **Android (Chrome):** mở link → ⋮ → **Cài đặt ứng dụng / Thêm vào màn hình chính**.

## Cấu trúc code

Không cần build, chỉ có HTML, CSS và JS thuần:

- `index.html`, `styles.css`, `app.js`: giao diện và logic (lưu tạm trên máy, đồng bộ lên Sheet).
- `sw.js`, `manifest.webmanifest`, `icons/`: cho phép cài như app và mở khi offline.
- `apps-script/Code.gs`: backend chạy trong Google Sheet.

Chạy thử trên máy: `python3 -m http.server` rồi mở http://localhost:8000.

## Sao lưu

- **Code:** repo GitHub này (hoặc tải ZIP: nút **Code → Download ZIP**).
- **Dữ liệu:** nằm trong Google Sheet. Có thể tải thêm bản CSV trong app: **Cài đặt → Dữ liệu → Tải về CSV**.
