/* vi language pack - generated key list, translations are hand written.
   Refresh after editing the English with:
       python tools/i18n.py navier-stokes --lang vi
   Keys are a hash of the English they replace, so an untranslated or outdated
   entry simply falls back to English rather than showing something stale. */
I18N.register("vi", {

  /* ---- Start ---- */
  // Start
  "a:0ae8097f": "Bắt đầu",

  /* ---- page ---- */
  // Navier–Stokes equations · F = ma for anything that flows
  "t:bb9fbcf0": "Phương trình Navier–Stokes · F = ma cho mọi thứ chảy được",

  // Honey, smoke and storms<br>follow the same line.
  "t:f6b71e7c": "Mật ong, khói và bão<br>cùng tuân theo một dòng.",

  // - Newton's second law, written for a fluid
  "t:d16d88a2": "- định luật II Newton, viết cho chất lưu",

  // Pour honey and it falls in a smooth, thin stream. Light a candle and the smoke rises straight
  // for a few centimetres, then breaks into curls. Both follow the same equation: F = ma for
  // something that has no shape of its own. Navier wrote it down in 1822 and Stokes in 1845. It is
  // used to forecast the weather, to design every aircraft, and to follow the blood in your arm. For
  // ninety years it also hid a question nobody could answer: can a smooth flow tear itself apart? In
  // September 2026 OpenAI claimed its AI had answered it. The claim is bigger than the proof: the
  // proof covers an easier version of the question, and the version most people mean is still open.
  "t:21dafdb9": "Rót mật ong, nó rơi thành một dòng mảnh và mượt. Thắp một ngọn nến, khói bay thẳng lên vài xăng-ti-mét rồi vỡ ra thành những cuộn xoáy. Cả hai đều tuân theo cùng một phương trình: F = ma cho một thứ không có hình dạng riêng. Navier viết nó ra năm 1822 và Stokes năm 1845. Nó được dùng để dự báo thời tiết, để thiết kế mọi chiếc máy bay, và để theo dõi máu chảy trong cánh tay bạn. Suốt chín mươi năm, nó còn giấu một câu hỏi không ai trả lời được: một dòng chảy trơn mượt có thể tự xé nát mình không? Tháng 9 năm 2026, OpenAI tuyên bố AI của họ đã trả lời được. Lời tuyên bố lớn hơn chứng minh: chứng minh chỉ giải một phiên bản dễ hơn của câu hỏi, còn phiên bản mà hầu hết mọi người nghĩ tới thì vẫn còn bỏ ngỏ.",

  /* ---- A river has no F = ma ---- */
  // A river has no F = ma
  "a:1535c26e": "Dòng sông không có F = ma",

  /* ---- page ---- */
  // Why can't you just write F = ma for a river?
  "t:a20e5fc4": "Vì sao không thể viết F = ma cho một dòng sông?",

  // You know F = ma: one object, one position, one velocity, and a force tells you how the velocity
  // changes. Now try it on the water in a river. Which object? A glass of water holds about <b>10²⁵
  // molecules</b>, and each one is hit about a billion times a second. You cannot follow them all -
  // and you do not want to. Nobody asks where one molecule went. They ask how fast the water is
  // moving <em>here</em>.
  "t:3f3ad951": "Bạn đã biết F = ma: một vật, một vị trí, một vận tốc, và lực cho biết vận tốc thay đổi thế nào. Giờ hãy thử với nước trong một dòng sông. Vật nào? Một cốc nước chứa khoảng <b>10²⁵ phân tử</b>, mỗi phân tử bị va đập chừng một tỉ lần mỗi giây. Bạn không thể theo dõi hết chúng - và cũng không muốn. Chẳng ai hỏi một phân tử đã đi đâu. Người ta hỏi nước <em>ở đây</em> đang chảy nhanh bao nhiêu.",

  // Stop following. Stand still and measure.
  "t:fa63f273": "Đừng đuổi theo. Đứng yên và đo.",

  // A river drawn as rows of arrows of different lengths, fast in the middle and slow at the banks,
  // with a fixed sensor measuring the arrow at one point
  "a:459a5968": "Một dòng sông vẽ bằng các hàng mũi tên dài ngắn khác nhau, nhanh ở giữa và chậm ở hai bờ, với một cảm biến cố định đo mũi tên tại một điểm",

  // velocity here, now
  "t:f74ae88c": "vận tốc tại đây",

  // A weather station does not chase the air. It stays in one place and records whatever wind
  // passes. Do the same with water: pick a point, and write down the speed and direction of whatever
  // water is there right now. Do it at every point and you have a <b>velocity field</b> - an arrow
  // at every place, changing with time. Write it <b>u(x, t)</b>: the velocity of the water at place
  // x at time t. This is what the equation is about. Not a particle: a field.
  "t:50b9cbab": "Trạm khí tượng không chạy theo không khí. Nó đứng yên một chỗ và ghi lại bất kỳ luồng gió nào đi qua. Hãy làm vậy với nước: chọn một điểm, rồi ghi lại tốc độ và hướng của phần nước đang ở đó ngay lúc này. Làm thế ở mọi điểm, bạn có một <b>trường vận tốc</b> - một mũi tên ở mỗi vị trí, thay đổi theo thời gian. Viết nó là <b>u(x, t)</b>: vận tốc của nước tại vị trí x vào thời điểm t. Phương trình nói về chính thứ này. Không phải một hạt: một trường.",

  // Then the equation is F = ma at every point at once
  "t:4e645f62": "Vậy phương trình là F = ma ở mọi điểm cùng một lúc",

  // A grid of small boxes of water with one highlighted; arrows from the neighbouring boxes push on
  // it
  "a:e6df12ba": "Một lưới các khối nước nhỏ, một khối được tô nổi; các mũi tên từ những khối lân cận đẩy vào nó",

  // F = ma for this one box
  "t:c8b4bb3c": "F = ma cho khối này",

  // … and for every other box
  "t:5932e3a3": "… và mọi khối khác",

  // Cut the river into tiny boxes. Each box is so small that all the water in it moves at nearly the
  // same velocity. Every box is a small object, and Newton's law works for each one: its mass times
  // its acceleration equals the push it gets from the boxes around it. One F = ma per box, and
  // endless boxes. That is all a <b>partial differential equation</b> is. It looks harder than F =
  // ma, but it says the same thing.
  "t:e46fc364": "Cắt dòng sông thành những khối rất nhỏ. Mỗi khối nhỏ đến mức toàn bộ nước trong đó chuyển động với vận tốc gần như nhau. Mỗi khối là một vật nhỏ, và định luật Newton đúng cho từng khối: khối lượng nhân gia tốc của nó bằng lực đẩy mà nó nhận từ các khối xung quanh. Mỗi khối một F = ma, và vô số khối. Đó là tất cả những gì một <b>phương trình đạo hàm riêng</b> nói. Trông nó khó hơn F = ma, nhưng nó nói cùng một điều.",

  // So the plan is set: F = ma for a small box of water, written with the field u(x, t). You need
  // two things: the box's <b>acceleration</b>, and the <b>forces</b> on it. <span>The acceleration
  // sounds like the easy half. It is where the trouble starts.</span>
  "t:2728adbc": "Vậy kế hoạch đã rõ: F = ma cho một khối nước nhỏ, viết bằng trường u(x, t). Bạn cần hai thứ: <b>gia tốc</b> của khối, và <b>các lực</b> tác dụng lên nó. <span>Gia tốc nghe như nửa dễ. Nhưng rắc rối bắt đầu từ đó.</span>",

  /* ---- Acceleration without change ---- */
  // Acceleration without change
  "a:a915d677": "Gia tốc mà không có gì thay đổi",

  /* ---- page ---- */
  // How does water speed up where nothing is changing?
  "t:a869569f": "Nước tăng tốc thế nào ở nơi không có gì thay đổi?",

  // The river narrows, and the flow is steady: it looks exactly the same now as it did an hour ago.
  // Steady sounds like nothing is speeding up - yet the water at the narrow mark moves three times
  // faster than at the wide mark. A leaf goes wherever the water goes, so watching the leaf is
  // watching <b>one small box of water</b>. A woman on a bridge watches only the spot right below
  // her; a boy runs along the river, keeping up with the leaf. Ask them both: is the water speeding
  // up? <b>Watch</b> the dashed copies the leaf leaves behind, one every second: the gaps between
  // them keep growing. Then watch what happens as the leaf passes under the bridge.
  "t:47e39d48": "Dòng sông hẹp dần, và dòng chảy ổn định: bây giờ trông y hệt như một giờ trước. Ổn định nghe như là chẳng có gì đang tăng tốc - vậy mà nước ở vạch chỗ hẹp chảy nhanh gấp ba lần ở vạch chỗ rộng. Chiếc lá trôi đến đâu nước trôi đến đó, nên nhìn chiếc lá chính là nhìn <b>một khối nước nhỏ</b>. Một người phụ nữ đứng trên cầu chỉ nhìn đúng chỗ nước ngay dưới chân mình; một cậu bé chạy dọc bờ sông, theo kịp chiếc lá. Hỏi cả hai: nước có đang tăng tốc không? <b>Hãy nhìn</b> những bản sao nét đứt mà chiếc lá để lại phía sau, mỗi giây một cái: khoảng cách giữa chúng cứ rộng dần. Rồi xem điều gì xảy ra khi chiếc lá đi qua dưới cầu.",

  // The river, live
  "t:7c53e140": "Dòng sông đang chảy",

  // one second on screen is one second in the river · the blue line below shows the water's speed at
  // each spot
  "t:c6a825f0": "một giây trên màn hình là một giây trên sông · đường màu xanh bên dưới cho biết tốc độ của nước tại mỗi chỗ",

  // On the bridge · one fixed spot
  "t:1ee383c5": "Trên cầu · một chỗ cố định",

  // It has been the same all day.
  "t:67c9441e": "Cả ngày nay vẫn vậy.",

  // Following the leaf · one box of water
  "t:623f787d": "Theo chiếc lá · một khối nước",

  // <b>Both are right.</b> The speed at each spot never changes, yet every box of water keeps moving
  // into faster water. F = ma is about the moving box, so the leaf's number is the acceleration we
  // are after.
  "t:3a80eaf5": "<b>Cả hai đều đúng.</b> Tốc độ tại mỗi chỗ không bao giờ đổi, vậy mà mỗi khối nước cứ liên tục trôi vào chỗ nước nhanh hơn. F = ma nói về khối nước đang chuyển động, nên con số của chiếc lá mới là gia tốc ta đang tìm.",

  // Move the bridge. Does she ever see a change? And does the leaf gain more, or less, at her spot?
  // <output id="bridgeOut">5.0 m · 2.0 m/s</output>
  "t:16f487f6": "Kéo cây cầu đi chỗ khác. Cô ấy có bao giờ thấy thay đổi không? Và tại chỗ cô ấy đứng, chiếc lá nhanh thêm nhiều hơn hay ít hơn? <output id=\"bridgeOut\">5,0 m · 2,0 m/s</output>",

  // The leaf's gain, in symbols
  "t:25f25837": "Mức tăng của chiếc lá, viết bằng ký hiệu",

  // how many metres the box moves each second
  "t:2191c3df": "mỗi giây khối nước đi được bao nhiêu mét",

  // how much faster the water gets with every metre
  "t:cff0df8c": "cứ mỗi mét, nước nhanh thêm bao nhiêu",

  // how much speed the box gains each second
  "t:1cea450c": "mỗi giây khối nước nhanh thêm bao nhiêu",

  // The blue line on the graph shows the water's speed at each spot, and you read it twice at the
  // leaf: its height tells you how far the box moves in one second, and its slope tells you how much
  // faster the water is one metre further on. That is why <b>u appears twice</b> - the water carries
  // its own speed along - and that product is what makes this equation so hard. The ∇ means "for
  // every metre further" in each of the three directions a river can carry a box: along it, across
  // it, and up or down. The dot with u picks out the direction the box is actually moving. On the
  // centre line of this straight river that is only downstream, so (u·∇)u is simply u × ∂u∕∂x.
  "t:fcdcd18e": "Đường màu xanh trên đồ thị cho biết tốc độ của nước tại mỗi chỗ, và tại chỗ chiếc lá bạn đọc nó hai lần: chiều cao của nó cho biết khối nước đi được bao xa trong một giây, còn độ dốc của nó cho biết nước ở chỗ cách đó một mét nhanh hơn bao nhiêu. Vì thế mà <b>u xuất hiện hai lần</b> - nước tự mang tốc độ của mình theo - và chính tích đó làm phương trình này khó đến vậy. Dấu ∇ nghĩa là \"cứ mỗi mét đi thêm\", theo từng hướng trong ba hướng mà dòng sông có thể cuốn một khối nước đi: dọc sông, ngang sông, và lên hay xuống. Dấu chấm với u chọn ra hướng mà khối nước thật sự đang đi. Trên đường giữa của dòng sông thẳng này, hướng đó chỉ là xuôi dòng, nên (u·∇)u đơn giản là u × ∂u∕∂x.",

  // The left-hand side - the "ma" of F = ma, for each cubic metre of water
  "t:50f72f1d": "Vế trái - phần \"ma\" của F = ma, cho mỗi mét khối nước",

  // change at one spot: 0
  "t:b69c2390": "thay đổi tại một chỗ: 0",

  // ρ (rho) is the density - the mass of one cubic metre of water. ∂u∕∂t is what the bridge sees:
  // how much the speed at one fixed spot changes in a second - zero everywhere in a steady river.
  // The bracket is the acceleration of the box under the leaf: the change at the spot plus the
  // change from moving. Here the first part is zero, so the leaf's whole gain comes from the second.
  // Physicists write the bracket as Du∕Dt for short.
  "t:6589895e": "ρ (rô) là khối lượng riêng - khối lượng của một mét khối nước. ∂u∕∂t là thứ người trên cầu thấy: tốc độ tại một chỗ cố định thay đổi bao nhiêu trong một giây - bằng không ở mọi chỗ trong một dòng sông ổn định. Ngoặc là gia tốc của khối nước dưới chiếc lá: phần thay đổi tại chỗ cộng phần thay đổi do di chuyển. Ở đây phần đầu bằng không, nên toàn bộ mức nhanh thêm của chiếc lá đến từ phần thứ hai. Các nhà vật lý viết gọn ngoặc này là Du∕Dt.",

  // This slide has <b>measured</b> the acceleration, but it has not explained it. A box of water has
  // no engine: if it speeds up, something must be pushing it. That something is the right-hand side
  // of F = ma. <span>So: what actually pushes a box of water?</span>
  "t:7a4815c5": "Trang này đã <b>đo</b> được gia tốc, nhưng chưa giải thích nó. Khối nước không có động cơ: nếu nó tăng tốc thì phải có cái gì đó đẩy nó. Cái gì đó ấy chính là vế phải của F = ma. <span>Vậy: thực sự cái gì đẩy một khối nước?</span>",

  /* ---- The three pushes ---- */
  // The three pushes
  "a:fd0b18e4": "Ba lực đẩy",

  /* ---- page ---- */
  // What actually pushes a box of water?
  "t:57c6f271": "Thực sự cái gì đẩy một khối nước?",

  // A box of water deep inside a river touches nothing but other water. Water cannot grab, and it
  // cannot kick. Yet the box under the leaf gained 0.4 m/s every second, so something must be
  // pushing on its surface. What can water do to water? Try the two experiments below:
  // <b>squeeze</b> the box harder on one side than the other, and <b>slide</b> it faster or slower
  // than the water above and below it. Watch when the push appears, and when it vanishes.
  "t:302472ed": "Một khối nước nằm sâu trong dòng sông chỉ chạm vào nước khác. Nước không thể nắm, cũng không thể đá. Vậy mà khối nước dưới chiếc lá cứ mỗi giây lại nhanh thêm 0,4 m/s, nên phải có cái gì đó đang đẩy vào mặt ngoài của nó. Nước có thể làm gì với nước? Hãy thử hai thí nghiệm dưới đây: <b>ép</b> khối nước một bên mạnh hơn bên kia, và <b>cho nó trượt</b> nhanh hơn hay chậm hơn lớp nước bên trên và bên dưới. Để ý lúc nào lực đẩy xuất hiện, và lúc nào nó biến mất.",

  // Two ways water pushes water
  "t:8c472af3": "Hai cách nước đẩy nước",

  // the numbers are the push on one cubic metre of water, in newtons · gravity on one cubic metre is
  // 9 800 N
  "t:830c5cd2": "các con số là lực đẩy lên một mét khối nước, tính bằng newton · trọng lực lên một mét khối là 9 800 N",

  // Pressure · squeezed from both sides
  "t:30edc136": "Áp suất · bị ép từ hai phía",

  // Tilt the pressure. Where does the push point? Set both sides equal: is there any push at all?
  // <output id="tiltOut">rises 2.0 kPa per metre to the right</output>
  "t:db1f6b5e": "Nghiêng áp suất đi. Lực đẩy hướng về đâu? Cho hai bên bằng nhau: còn lực đẩy nào không? <output id=\"tiltOut\">tăng 2,0 kPa mỗi mét về bên phải</output>",

  // Friction · sliding past the neighbours
  "t:a4f5002d": "Ma sát · trượt qua các lớp bên cạnh",

  // Change the middle layer's speed. When does the drag change direction? <output id="speedOut">0.9
  // m/s</output>
  "t:8b863d73": "Đổi tốc độ của lớp giữa. Khi nào lực kéo đổi chiều? <output id=\"speedOut\">0,9 m/s</output>",

  // Same picture, other fluid:
  "t:229f0649": "Cùng hình này, chất lỏng khác:",

  // air
  "t:33324a17": "không khí",

  // water
  "t:49c69a10": "nước",

  // honey
  "t:316a8164": "mật ong",

  // The Navier–Stokes equations, 1822–1845 - Newton's second law for a box of water
  "t:7a39bdd3": "Phương trình Navier–Stokes, 1822–1845 - định luật II Newton cho một khối nước",

  // the pressure push: toward the low side, and only where pressure is uneven
  "t:2487daa6": "lực đẩy của áp suất: hướng về bên áp suất thấp, và chỉ ở nơi áp suất không đều",

  // the friction drag: toward the neighbours' average speed, μ times how far you are from it
  "t:32c20420": "lực kéo do ma sát: hướng về tốc độ trung bình của các lớp bên cạnh, bằng μ nhân với mức chênh lệch",

  // gravity: on the whole box, not through its surface
  "t:322634f4": "trọng lực: tác dụng lên cả khối, không qua mặt ngoài",

  // the left-hand side: mass times acceleration, per cubic metre
  "t:88c4c10a": "vế trái: khối lượng nhân gia tốc, tính trên mỗi mét khối",

  // Nobody tells you the pressure in advance. Water cannot be squashed, so what flows into any box
  // must flow out again - written <b>∇·u = 0</b> - and the pressure becomes whatever it has to be to
  // keep that true. Push on the water anywhere and the pressure everywhere shifts to make room.
  "t:79cdcc79": "Không ai cho bạn biết trước áp suất. Nước không thể nén được, nên bao nhiêu nước chảy vào một khối thì bấy nhiêu phải chảy ra - viết là <b>∇·u = 0</b> - và áp suất trở thành bất kỳ giá trị nào cần có để giữ điều đó đúng. Đẩy vào nước ở bất cứ đâu, áp suất ở mọi nơi sẽ dịch chuyển để nhường chỗ.",

  // <b>μ</b> water 0.001 · air 0.000018 · honey about 5 (pascal-seconds)
  "t:d5eb7e69": "<b>μ</b> nước 0,001 · không khí 0,000018 · mật ong khoảng 5 (pascal-giây)",

  // <b>Left out</b> squashing, so no sound waves; heat, unless you add an equation for it
  "t:36ded46c": "<b>Bỏ qua</b> sự nén, nên không có sóng âm; nhiệt, trừ khi bạn thêm một phương trình cho nó",

  // <b>On a turning planet</b> the Earth's spin adds one more push, and that is why big storms spin
  "t:4d3fe8d7": "<b>Trên một hành tinh đang quay</b>, sự quay của Trái Đất thêm vào một lực đẩy nữa, và đó là lý do các cơn bão lớn xoay tròn",

  // Two of these terms fight. <b>(u·∇)u</b> carries swirls along and makes them sharper; <b>μ∇²u</b>
  // smooths every difference away. Everything a fluid does depends on which one is winning.
  // <span>That is why honey and smoke, following one line, look nothing alike.</span>
  "t:7067ead4": "Hai trong các số hạng này đối đầu nhau. <b>(u·∇)u</b> cuốn các xoáy đi và làm chúng sắc hơn; <b>μ∇²u</b> xóa mờ mọi khác biệt. Mọi điều một chất lưu làm đều tùy vào bên nào đang thắng. <span>Vì thế mà mật ong và khói, cùng tuân theo một dòng, lại trông chẳng giống nhau chút nào.</span>",

  /* ---- Honey versus smoke ---- */
  // Honey versus smoke
  "a:52b0408b": "Mật ong và khói",

  /* ---- page ---- */
  // Why does honey pour smoothly while smoke curls?
  "t:762e00d2": "Vì sao mật ong rót mượt còn khói lại cuộn xoáy?",

  // Same equation, opposite behaviour. Honey pours in a smooth stream; smoke rises straight, then
  // curls. The difference is which of the two fighting terms is bigger - carrying, <b>(u·∇)u</b>, or
  // friction, <b>μ∇²u</b> - and one number tells you.
  "t:c4793029": "Cùng một phương trình, hai cách ứng xử trái ngược. Mật ong rót thành dòng mượt; khói bay thẳng lên rồi cuộn xoáy. Khác biệt nằm ở chỗ số hạng nào trong hai số hạng đối đầu lớn hơn - cuốn theo, <b>(u·∇)u</b>, hay ma sát, <b>μ∇²u</b> - và một con số cho bạn biết điều đó.",

  // The number: three rough sizes
  "t:af32d48e": "Con số: ba ước lượng thô",

  // carrying: at speed U, the velocity changes by about U over the size L of the object
  "t:80f4a5c8": "cuốn theo: ở tốc độ U, vận tốc thay đổi cỡ U trên quãng L bằng kích thước vật",

  // friction: the same change of U over the same L, but the "slope of the slope"
  "t:f4f7da45": "ma sát: cùng mức thay đổi U trên cùng quãng L, nhưng là \"độ dốc của độ dốc\"",

  // their ratio. Every unit cancels; this plain number is the Reynolds number
  "t:f17c9364": "tỉ số của hai số hạng. Mọi đơn vị triệt tiêu; con số trần trụi này là số Reynolds",

  // Two flows with the same Re look the same, however different their size and speed.
  "t:b581053e": "Hai dòng chảy có cùng Re thì trông giống nhau, dù kích thước và tốc độ khác nhau đến đâu.",

  // Five cases
  "t:ff5efa20": "Năm trường hợp",

  // Case:
  "t:ec543df1": "Trường hợp:",

  // bacteria
  "t:5ba83936": "vi khuẩn",

  // honey from a spoon
  "t:88af1916": "mật ong chảy từ thìa",

  // stick in a stream
  "t:f59d43db": "que cắm trong dòng suối",

  // passenger plane
  "t:dcf3cd89": "máy bay chở khách",

  // a storm
  "t:2f61a84d": "một cơn bão",

  // Re 40 to 2 000 · carrying and friction fight
  "t:2638ab5e": "Re từ 40 đến 2 000 · cuốn theo và ma sát giằng co",

  // Same case, other fluid:
  "t:fb8a16f9": "Cùng trường hợp, chất lỏng khác:",

  /* ---- Run the equation ---- */
  // Run the equation
  "a:e2a9a3f5": "Chạy phương trình",

  // Run the equation: from smooth flow to a vortex street
  "t:d9beace2": "Chạy phương trình: từ dòng chảy êm đềm đến dòng xoáy",

  /* ---- page ---- */
  // Honey
  "t:d7278604": "Mật ong",

  // Water
  "t:d63556b0": "Nước",

  // Fast stream
  "t:95c7924d": "Suối chảy xiết",

  // Big stone
  "t:d046b5f8": "Đá to",

  // Aircraft
  "t:f057fe93": "Máy bay",

  // A storm
  "t:34ca3f6d": "Một cơn bão",

  // Stir and let go
  "t:16346e31": "Khuấy rồi thả",

  // ⛶ Full screen
  "t:207f66fe": "⛶ Toàn màn hình",

  // time
  "t:5d3c9be4": "thời gian",

  // <i class="k-ccw"></i>anticlockwise swirl
  "t:189538cb": "<i class=\"k-ccw\"></i>xoáy ngược chiều kim đồng hồ",

  // <i class="k-cw"></i>clockwise swirl
  "t:a5bd213a": "<i class=\"k-cw\"></i>xoáy theo chiều kim đồng hồ",

  // <i class="k-stone"></i>the stone - water sticks to its surface
  "t:7ed10a21": "<i class=\"k-stone\"></i>hòn đá - nước bám vào mặt đá",

  // <i class="k-probe"></i>sensor, two stone-widths behind the stone
  "t:b3991e8c": "<i class=\"k-probe\"></i>cảm biến, cách hòn đá hai lần bề rộng đá",

  // Sensor behind the stone
  "t:0701aeeb": "Cảm biến phía sau hòn đá",

  // sideways velocity · last 0.6 s
  "t:67f8f5d5": "vận tốc ngang · 0,6 s gần nhất",

  // A steady flow gives a flat line. When it starts to swing by itself, the flow has picked a rhythm
  // nobody gave it. The time between swings, T, is what makes a wire sing in the wind.
  "t:3ec79855": "Dòng chảy ổn định cho một đường thẳng. Khi đường này tự đung đưa, dòng chảy đã tự chọn lấy một nhịp mà không ai cho nó. Thời gian giữa hai lần đung đưa, T, chính là thứ làm dây điện ngân lên trong gió.",

  // The numbers
  "t:5e0e72c2": "Các con số",

  // this run
  "t:837d1b34": "lần chạy này",

  // for comparison
  "t:2936bf71": "để so sánh",

  // flow speed U
  "t:a4cde3b1": "tốc độ dòng U",

  // stone size D
  "t:23c7895b": "kích thước hòn đá D",

  // Reynolds number U·D∕ν
  "t:15040168": "Số Reynolds U·D∕ν",

  // swirls break off above ≈ 47
  "t:4a6f9c4f": "xoáy tách ra khi Re trên ≈ 47",

  // a swirl breaks off every
  "t:966167af": "cứ mỗi bao lâu lại có một xoáy tách ra",

  // movement energy left
  "t:a90a2275": "năng lượng chuyển động còn lại",

  // Scale: one grid cell is 1 mm and one solver step is 1 ms, so the stone is 14 mm wide. ν ("nu")
  // is the viscosity divided by the density; real water has ν = 1 mm²/s, so the fluid called "Water"
  // here is about 120 times thicker. Re = U·D∕ν.
  "t:11adea35": "Tỉ lệ: một ô lưới là 1 mm và một bước giải là 1 ms, nên hòn đá rộng 14 mm. ν (\"nuy\") là độ nhớt chia cho khối lượng riêng; nước thật có ν = 1 mm²/s, nên chất lỏng gọi là \"Nước\" ở đây đặc hơn khoảng 120 lần. Re = U·D∕ν.",

  // Viscosity ν <output id="viscValue">120 mm²/s</output>
  "t:5e4851cb": "Độ nhớt ν <output id=\"viscValue\">120 mm²/s</output>",

  // ¼ speed
  "t:4d68763c": "¼ tốc độ",

  // ↺ Reset
  "t:9a3422d6": "↺ Đặt lại",

  /* ---- The Millennium Prize Problem ---- */
  // The Millennium Prize Problem
  "a:16ce1db1": "Bài toán Thiên niên kỷ",

  // The Millennium Prize Problem
  "t:16ce1db1": "Bài toán Thiên niên kỷ",

  /* ---- page ---- */
  // In 2000 the Clay Mathematics Institute named seven unsolved problems, the <b>Millennium Prize
  // Problems</b>, a million dollars each. One is about this equation. It does not ask you to solve
  // it; it asks one question: <b>starting from any smooth flow in three dimensions, does the flow
  // stay smooth for ever?</b>
  "t:2e60f9e3": "Năm 2000, Viện Toán học Clay nêu tên bảy bài toán chưa có lời giải, <b>các Bài toán Thiên niên kỷ</b>, mỗi bài một triệu đô-la. Một trong số đó nói về chính phương trình này. Nó không yêu cầu bạn giải phương trình; nó chỉ hỏi một câu: <b>xuất phát từ một dòng chảy trơn mượt bất kỳ trong không gian ba chiều, dòng chảy có trơn mượt mãi mãi không?</b>",

  // Why it must be proved
  "t:0bbd137e": "Vì sao phải chứng minh",

  // The equation runs every weather forecast, aircraft design and blood-flow model, yet nobody knows
  // whether its answers always exist and stay smooth. If a smooth flow can blow up, the equation
  // stops describing water at that moment, and every use of it rests on a model with a hole in it.
  "t:dc0860bc": "Phương trình này chạy mọi bản dự báo thời tiết, mọi thiết kế máy bay và mọi mô hình dòng máu, vậy mà chưa ai biết lời giải của nó có luôn tồn tại và trơn mượt hay không. Nếu một dòng chảy trơn mượt có thể nổ tung, thì tại thời điểm đó phương trình không còn mô tả nước nữa, và mọi ứng dụng của nó đứng trên một mô hình có lỗ hổng.",

  // What solving it gives
  "t:fd98e5c2": "Giải được thì được gì",

  // A yes means the equation is a complete description of a fluid and its simulations can be trusted
  // in principle. A no marks exactly where the model fails and where new physics must enter. Either
  // way, the tools built for the proof are the tools turbulence has been waiting for.
  "t:287d5111": "Câu trả lời \"có\" nghĩa là phương trình mô tả trọn vẹn một chất lưu và về nguyên tắc có thể tin vào các mô phỏng của nó. Câu trả lời \"không\" chỉ ra chính xác chỗ mô hình thất bại và chỗ vật lý mới phải bước vào. Dù thế nào, những công cụ được tạo ra để chứng minh chính là những công cụ mà bài toán rối loạn vẫn đang chờ.",

  // <b>Why it is hard.</b> The other outcome is a <b>blow-up</b>: in a limited time the flow
  // squeezes its swirl into one point, with infinite speed and spin. In two dimensions that never
  // happens, and it is proved. In three dimensions a swirl can stretch along its own axis and spin
  // faster as it thins, and nobody has proved that friction always wins that race.
  "t:fdb2cd36": "<b>Vì sao khó.</b> Kết cục còn lại là <b>nổ tung</b> (blow-up): trong một thời gian hữu hạn, dòng chảy dồn xoáy của mình vào một điểm, với tốc độ và độ xoáy vô hạn. Trong hai chiều, điều đó không bao giờ xảy ra, và đã được chứng minh. Trong ba chiều, một xoáy có thể bị kéo dãn dọc theo trục của nó và xoay nhanh hơn khi mảnh đi, và chưa ai chứng minh được rằng ma sát luôn thắng cuộc đua đó.",

  // <b>The prize sheet accepts the question in four forms.</b> The water either fills all of space
  // or sits in a box that repeats in every direction. And you may prove either that every smooth
  // start stays smooth with no outside push, or that some smooth start blows up when a smooth
  // outside push is allowed. Proving any one of the four wins.
  "t:f4822108": "<b>Đề bài chấp nhận câu hỏi dưới bốn dạng.</b> Nước hoặc lấp đầy toàn bộ không gian, hoặc nằm trong một hộp lặp lại theo mọi hướng. Và bạn có thể chứng minh hoặc là mọi dòng chảy trơn mượt vẫn trơn mượt mãi khi không có lực đẩy từ bên ngoài, hoặc là một dòng chảy trơn mượt nào đó nổ tung khi được phép có một lực đẩy trơn mượt từ bên ngoài. Chứng minh được bất kỳ dạng nào trong bốn dạng là thắng.",

  // water fills all of space
  "t:b6515f34": "nước lấp đầy toàn bộ không gian",

  // water in a repeating box
  "t:0af8cb20": "nước trong hộp tự lặp lại",

  // Smooth for ever
  "t:836f9d60": "Mãi trơn mượt",

  // no outside push
  "t:6960d9e7": "không có lực đẩy từ ngoài",

  // (A)
  "t:6258f711": "(A)",

  // Every smooth start stays smooth for ever.
  "t:9c968a2b": "Mọi khởi đầu mượt đều mãi mượt.",

  // still open
  "t:262829ef": "còn bỏ ngỏ",

  // (B)
  "t:6a56c512": "(B)",

  // Same, inside the repeating box.
  "t:376a457a": "Như trên, trong hộp tự lặp lại.",

  // Blow-up
  "t:8f843869": "Nổ tung",

  // a smooth outside push is allowed
  "t:f17568a1": "được phép có lực đẩy ngoài mượt",

  // (C)
  "t:0653e90f": "(C)",

  // Some smooth start, with some smooth push, blows up in a limited time.
  "t:397e1832": "Một dòng chảy trơn mượt nào đó, với một lực đẩy trơn mượt nào đó, nổ tung trong thời gian hữu hạn.",

  // OpenAI's proof, September 2026
  "t:05ef7018": "Chứng minh của OpenAI, tháng 9/2026",

  // (D)
  "t:de516b80": "(D)",

  // not claimed
  "t:8c937953": "chưa ai tuyên bố",

  // What was claimed
  "t:1e2e1463": "Điều đã được tuyên bố",

  // Version <b>(C)</b>: a swirl in all of space that tightens and spins ever faster, while a smooth
  // outside push helps it along. If the proof holds, that counts for the prize.
  "t:7830c489": "Dạng <b>(C)</b>: một xoáy trong toàn bộ không gian cứ thắt chặt lại và xoay ngày càng nhanh, trong khi một lực đẩy trơn mượt từ bên ngoài giúp sức. Nếu chứng minh đứng vững, thế là đủ để nhận giải.",

  // What it does not settle
  "t:8e7b40a7": "Điều chưa được giải quyết",

  // (A) says water <em>left alone</em> never blows up. (C) says water <em>with the right push</em>
  // can. Both can be true at once, so (C) says nothing about (A).
  "t:849faf6a": "(A) nói rằng nước <em>để yên</em> không bao giờ nổ tung. (C) nói rằng nước <em>với lực đẩy thích hợp</em> thì có thể. Cả hai có thể cùng đúng, nên (C) không nói gì về (A).",

  // Why the push matters
  "t:5589ecbc": "Vì sao lực đẩy quan trọng",

  // A push feeds energy to the right place at the right moment. Water left alone only loses energy
  // to friction.
  "t:76d91e9c": "Lực đẩy đưa năng lượng vào đúng chỗ, đúng lúc. Nước để yên chỉ mất dần năng lượng vì ma sát.",

  // So "AI solved Navier–Stokes" means a proof of version (C), the form with a helping push. The no-
  // push forms (A) and (B) are still open. <span>Still, a blow-up of any kind was thought impossible
  // ten years ago. How can 3D water do what your 2D screen never did?</span>
  "t:9ea3ecfe": "Vậy \"AI đã giải Navier–Stokes\" nghĩa là một chứng minh cho dạng (C), dạng có lực đẩy giúp sức. Các dạng không có lực đẩy (A) và (B) vẫn còn bỏ ngỏ. <span>Dù vậy, mười năm trước người ta còn cho rằng không thể có nổ tung dưới bất kỳ dạng nào. Làm sao nước 3D làm được điều mà màn hình 2D của bạn không bao giờ làm được?</span>",

  /* ---- What the AI proved ---- */
  // What the AI proved
  "a:48b12820": "AI đã chứng minh gì",

  /* ---- page ---- */
  // How can 3D water blow up - and does the water care?
  "t:c2ad3f65": "Làm sao nước 3D nổ tung được - và nước có quan tâm không?",

  // On your screen, however messy the flow got, every speed stayed limited. That is a theorem in two
  // dimensions. In three dimensions there is one extra move a swirl can make, and it is the whole
  // difference.
  "t:f9646c59": "Trên màn hình của bạn, dù dòng chảy hỗn độn đến đâu, mọi tốc độ vẫn có giới hạn. Đó là một định lý trong hai chiều. Trong ba chiều, xoáy có thêm một nước đi, và đó là toàn bộ sự khác biệt.",

  // A tube of swirl, stretched
  "t:e75ae500": "Một ống xoáy bị kéo dãn",

  // a drawing of the mechanism with an assumed result, not a computation of the equation
  "t:7d89a982": "hình vẽ cơ chế với một kết quả giả định, không phải tính toán từ phương trình",

  // with a push
  "t:005830aa": "có lực đẩy",

  // left alone
  "t:36316cb7": "để yên",

  // tube width
  "t:4840f9f7": "bề rộng ống",

  // spin
  "t:0914d819": "độ xoáy",

  // energy left
  "t:6ba265e6": "năng lượng còn lại",

  // ↺ restart
  "t:5bb210fe": "↺ chạy lại",

  // In two dimensions a swirl can only be carried and smoothed. In three it can be <b>pulled
  // longer</b>: like a skater pulling in her arms, it spins faster as it thins, and a thinner,
  // faster tube stretches harder still. Friction fights this, and the fight gets harder as the tube
  // gets thinner.
  "t:3e8bd711": "Trong hai chiều, một xoáy chỉ có thể bị cuốn đi và làm mượt. Trong ba chiều, nó có thể bị <b>kéo dài ra</b>: như vận động viên trượt băng thu tay vào, nó xoay nhanh hơn khi mảnh đi, và một ống mảnh hơn, xoay nhanh hơn lại kéo dãn mạnh hơn nữa. Ma sát chống lại điều này, và cuộc đấu càng khó khi ống càng mảnh.",

  // What was announced on 8 September 2026
  "t:5966556b": "Điều được công bố ngày 8 tháng 9 năm 2026",

  // reported by OpenAI · mathematicians are still checking it
  "t:251c3b07": "do OpenAI công bố · các nhà toán học vẫn đang kiểm tra",

  // <b>1</b><b>Blow-up, with a push.</b> OpenAI reported that one of its AI models produced a proof
  // that the 3D Navier–Stokes equations <em>can</em> blow up in a limited time when a smooth outside
  // push is allowed: a swirl that gets tighter and spins ever faster while the total energy stays
  // limited. That is the third of the four official versions.
  "t:4964ff80": "<b>1</b><b>Nổ tung, khi có lực đẩy.</b> OpenAI công bố rằng một mô hình AI của họ đã tạo ra chứng minh rằng phương trình Navier–Stokes 3D <em>có thể</em> nổ tung trong thời gian hữu hạn khi được phép có một lực đẩy ngoài mượt: một xoáy thắt lại và quay ngày càng nhanh trong khi tổng năng lượng vẫn hữu hạn. Đó là phiên bản thứ ba trong bốn phiên bản chính thức.",

  // <b>2</b><b>Checked by computer.</b> The proof was written for Lean, a program that checks every
  // step of a proof, so a computer checked the steps rather than a human reader. Humans still have
  // to check that the statement proved is the one the prize asks for. The company said the winning
  // run took 88 hours and up to 10,000 AI agents working together.
  "t:16ad5996": "<b>2</b><b>Máy tính kiểm tra.</b> Chứng minh được viết cho Lean, một chương trình kiểm tra từng bước của một chứng minh, nên máy tính kiểm tra các bước thay cho người đọc. Con người vẫn phải kiểm tra rằng mệnh đề được chứng minh đúng là mệnh đề mà giải thưởng yêu cầu. Công ty cho biết lần chạy thành công kéo dài 88 giờ với tới 10.000 tác tử AI cùng làm việc.",

  // <b>3</b><b>Not yet the prize.</b> The Clay Mathematics Institute asks for the proof to be
  // published and to hold up for two years before it pays the money. Mathematicians are still
  // reading it. In the same week, Levent Alpöge and Tristan Buckmaster reported related results,
  // with an argument over who should get the credit.
  "t:e34074f0": "<b>3</b><b>Chưa phải giải thưởng.</b> Viện Toán học Clay yêu cầu chứng minh phải được công bố và đứng vững hai năm rồi mới trao tiền. Các nhà toán học vẫn đang đọc nó. Cùng tuần đó, Levent Alpöge và Tristan Buckmaster công bố các kết quả liên quan, kèm một cuộc tranh cãi về việc ai xứng đáng được ghi công.",

  // Did the AI do it alone? No.
  "t:5a6a4b56": "AI tự làm một mình? Không.",

  // Humans chose which of the four versions to attack. The proof builds on a method from two Spanish
  // mathematicians, Diego Córdoba and Luis Martínez-Zoroa - "the heroes of the story", said Charles
  // Fefferman, who wrote the prize question. And Lean, the checker that told the AI "wrong"
  // thousands of times, was built by people. What moved to the machine is building the proof itself.
  // That step had never moved before.
  "t:2ba8c0fd": "Con người chọn tấn công phiên bản nào trong bốn. Chứng minh dựa trên phương pháp của hai nhà toán học Tây Ban Nha, Diego Córdoba và Luis Martínez-Zoroa - \"những người hùng của câu chuyện\", theo lời Charles Fefferman, người viết đề bài giải thưởng. Và Lean, bộ kiểm tra đã bảo AI \"sai\" hàng nghìn lần, là do con người xây nên. Thứ chuyển sang cho máy là việc tự xây dựng chứng minh. Bước đó trước đây chưa từng chuyển.",

  // 88 hours is the winning run
  "t:4f6b7744": "88 giờ là lần chạy thành công",

  // That is how long the run that worked took. It does not say how many runs failed first, or how
  // long people spent setting the system up. A proof checked by Lean is correct however many tries
  // it took. How <em>capable</em> the AI is depends on those hidden tries, and they have not been
  // published.
  "t:c252805a": "Đó là thời gian của lần chạy đã thành công. Nó không cho biết bao nhiêu lần chạy đã thất bại trước đó, hay người ta mất bao lâu để dựng hệ thống. Một chứng minh được Lean kiểm tra thì đúng, dù mất bao nhiêu lần thử. Nhưng AI <em>giỏi</em> đến đâu lại phụ thuộc vào những lần thử bị giấu đi ấy, và chúng chưa được công bố.",

  // Does the sea care? No.
  "t:a0fb87a1": "Biển có quan tâm không? Không.",

  // Blow-up is a fact about the <em>model</em>. Long before any real swirl reached infinite speed,
  // it would shrink to the size of a molecule. There, "a box of water" means nothing any more, and
  // the equation was never valid to begin with. The result marks the edge of the map, not a new
  // thing water can do.
  "t:7f730aac": "Nổ tung là một sự thật về <em>mô hình</em>. Lâu trước khi một xoáy thật đạt tới tốc độ vô hạn, nó đã co lại tới cỡ một phân tử. Ở đó, \"một khối nước\" không còn nghĩa gì nữa, và phương trình vốn chưa bao giờ đúng ở đó. Kết quả này đánh dấu mép của bản đồ, không phải một điều mới mà nước có thể làm.",

  // So the equation is F = ma for water. It works everywhere it has ever been tested. And, at least
  // when something is stirring it, it carries a built-in breaking point that real water never
  // reaches. <span>The law you started with has now been to the sky with Newton and into the water
  // with Navier and Stokes.</span>
  "t:dc83c88d": "Vậy phương trình này là F = ma cho nước. Nó đúng ở mọi nơi từng được kiểm chứng. Và, ít nhất là khi có thứ gì đó khuấy nó, nó mang sẵn một điểm gãy mà nước thật không bao giờ chạm tới. <span>Định luật bạn bắt đầu cùng đã lên trời với Newton và xuống nước với Navier và Stokes.</span>",

  // Back to the beginning: F = ma <i>→</i>
  "t:d121fcf9": "Về lại điểm đầu: F = ma <i>→</i>",

  // ← Previous
  "t:2cd493c0": "← Trước",

  // Next →
  "t:cb20ddde": "Tiếp →",

  // Questions?
  "t:19b57d27": "Có câu hỏi?",

  // Ask a question about this lesson
  "t:a34a7756": "Đặt câu hỏi về bài học này",

  // Sign in with GitHub to post. Comments are stored as a GitHub Discussion.
  "t:bfa2da2e": "Đăng nhập bằng GitHub để đăng. Bình luận được lưu dưới dạng một GitHub Discussion.",

  // Close
  "t:cd86acc3": "Đóng",

  // A simple walkthrough of the Navier–Stokes equations - Newton's second law for anything that
  // flows - ending in a live fluid simulator: set honey against water, watch swirls form behind a
  // stone, and see why the 3D version hid a million-dollar question until 2026.
  "a:8cc51198": "Bài giảng đơn giản về phương trình Navier–Stokes - định luật II Newton cho mọi thứ chảy được - kết thúc bằng một mô phỏng chất lưu chạy trực tiếp: đặt mật ong đối đầu với nước, xem các xoáy hình thành phía sau hòn đá, và hiểu vì sao phiên bản 3D giấu một câu hỏi triệu đô cho tới năm 2026.",

  // Navier–Stokes equations - honey, smoke and the million-dollar swirl
  "t:30efdcb6": "Phương trình Navier–Stokes - mật ong, khói và cái xoáy triệu đô",

  /* ---- simulators ---- */
  // {f} × the start
  "js.blow.width": "{f} × lúc đầu",

  // {f} × the start
  "js.blow.spin": "{f} × lúc đầu",

  // {p} %
  "js.blow.energy": "{p} %",

  // {s} s of {T} s
  "js.blow.timePush": "{s} s trên {T} s",

  // {s} s
  "js.blow.timeFree": "{s} s",

  // Blow-up: width zero, spin infinite, energy still limited
  "js.blow.vBlow": "Nổ tung: bề rộng bằng không, độ xoáy vô hạn, năng lượng vẫn hữu hạn",

  // The push stretches the tube; thinner means faster spin
  "js.blow.vPush": "Lực đẩy kéo dãn ống; càng mảnh càng xoay nhanh",

  // This is what the proof says the equation can do when a smooth push is allowed. Real water would
  // have shrunk to molecules long before.
  "js.blow.vBlowD": "Đây là điều chứng minh nói rằng phương trình có thể làm khi được phép có một lực đẩy trơn mượt. Nước thật đã co lại đến cỡ phân tử từ lâu trước đó.",

  // Angular momentum is kept, so spin grows as 1 ∕ width². Each thinner, faster tube stretches
  // harder still, and the picture repeats at a smaller scale.
  "js.blow.vPushD": "Mô-men động lượng được giữ nguyên, nên độ xoáy tăng theo 1 ∕ bề rộng². Mỗi ống mảnh hơn, nhanh hơn lại kéo dãn mạnh hơn nữa, và hình ảnh lặp lại ở tỉ lệ nhỏ hơn.",

  // No push: friction catches up and the tube smears out
  "js.blow.vFree": "Không có lực đẩy: ma sát đuổi kịp và ống nhòe ra",

  // The tube thins for a while, but with nothing feeding it, friction wins and the spin dies away.
  // Whether this always happens in 3D is the open question.
  "js.blow.vFreeD": "Ống mảnh đi một lúc, nhưng không có gì nuôi nó, ma sát thắng và độ xoáy tắt dần. Điều này có luôn xảy ra trong ba chiều hay không chính là câu hỏi còn bỏ ngỏ.",

  // camera fixed
  "js.blow.followOff": "máy quay đứng yên",

  // camera follows the zoom
  "js.blow.followOn": "máy quay đi theo độ phóng to",

  // Honey
  "js.fluid.mode.honey.title": "Mật ong",

  // Re ≈ 2. Friction is far bigger than carrying, so every swirl is wiped out as soon as it forms.
  // The flow closes up behind the stone as smoothly as it opened.
  "js.fluid.mode.honey.note": "Re ≈ 2. Ma sát lớn hơn cuốn theo rất nhiều, nên mọi xoáy vừa hình thành đã bị xóa ngay. Dòng chảy khép lại phía sau hòn đá mượt y như lúc nó mở ra.",

  // Water
  "js.fluid.mode.water.title": "Nước",

  // Re ≈ 120. Carrying now beats friction in most of the flow. Two swirls form behind the stone;
  // then one grows, breaks away, and the other follows on the opposite side. Give it a second or
  // two.
  "js.fluid.mode.water.note": "Re ≈ 120. Cuốn theo nay đã thắng ma sát ở phần lớn dòng chảy. Hai xoáy hình thành sau hòn đá; rồi một xoáy lớn lên, tách ra, và xoáy kia nối gót ở phía đối diện. Hãy cho nó một hai giây.",

  // Fast stream
  "js.fluid.mode.fast.title": "Suối chảy xiết",

  // Re in the thousands. The swirls that break off no longer stay neat: they stretch, join and break
  // apart. In a real 3D stream this is where turbulence begins.
  "js.fluid.mode.fast.note": "Re lên tới hàng nghìn. Các xoáy tách ra không còn gọn gàng nữa: chúng kéo dài, nhập vào nhau rồi vỡ ra. Trong một dòng suối 3D thật, đây là nơi rối loạn bắt đầu.",

  // Big stone
  "js.fluid.mode.big.title": "Đá to",

  // Same water, same speed, a stone twice as wide - and Re doubles. The street forms sooner and its
  // swirls are twice the size, but D∕(U·T) stays near 0.2. Only the ratio matters.
  "js.fluid.mode.big.note": "Cùng nước, cùng tốc độ, hòn đá rộng gấp đôi - và Re tăng gấp đôi. Dãy xoáy hình thành sớm hơn và các xoáy to gấp đôi, nhưng D∕(U·T) vẫn ở gần 0,2. Chỉ tỉ số mới quan trọng.",

  // Aircraft
  "js.fluid.mode.wing.title": "Máy bay",

  // An aircraft-shaped block seen from above, at the highest Re this grid can reach. The wake behind
  // it swings from side to side, as it does behind the stone - and that is honest for a blunt shape
  // at Re ≈ 5 000. A real aircraft flies at Re ≈ 10⁸, is thin and streamlined, and its air stays
  // attached to the wings: seen from above it would leave only a narrow trail behind the wingtips
  // and tail. No slider here gets you there.
  "js.fluid.mode.wing.note": "Một khối hình máy bay nhìn từ trên xuống, ở Re cao nhất mà lưới này đạt được. Vệt phía sau nó đung đưa sang hai bên, y như sau hòn đá - và điều đó là trung thực với một hình dạng cùn ở Re ≈ 5 000. Máy bay thật bay ở Re ≈ 10⁸, mỏng và thuôn dòng, nên không khí bám sát cánh: nhìn từ trên xuống, nó chỉ để lại một vệt hẹp sau đầu cánh và đuôi. Không thanh trượt nào ở đây đưa bạn tới đó được.",

  // A storm
  "js.fluid.mode.storm.title": "Một cơn bão",

  // A storm seen from above, growing. Warm sea keeps feeding the swirl at its centre; the carrying
  // term winds the cloud bands into spiral arms and keeps the eye clear; friction takes energy away.
  // While the feed beats the friction, the storm grows. Turn viscosity up and friction wins.
  "js.fluid.mode.storm.note": "Một cơn bão nhìn từ trên xuống, đang lớn dần. Biển ấm liên tục nuôi xoáy ở tâm; số hạng cuốn theo cuộn các dải mây thành những cánh tay xoắn ốc và giữ mắt bão quang đãng; ma sát lấy năng lượng đi. Chừng nào nguồn nuôi còn thắng ma sát, cơn bão còn lớn lên. Tăng độ nhớt lên và ma sát sẽ thắng.",

  // Stir and let go
  "js.fluid.mode.stir.title": "Khuấy rồi thả",

  // No flow in, no stone: three swirls set going in a closed box and left alone. Carrying only moves
  // energy around; friction only takes it away. Turn viscosity up and the energy falls faster.
  "js.fluid.mode.stir.note": "Không có dòng vào, không có hòn đá: ba xoáy được khuấy lên trong một hộp kín rồi để yên. Cuốn theo chỉ chuyển năng lượng đi chỗ khác; ma sát chỉ lấy nó đi. Tăng độ nhớt lên và năng lượng giảm nhanh hơn.",

  // A storm, from above
  "js.fluid.bench.storm": "Một cơn bão, nhìn từ trên xuống",

  // A closed box of water
  "js.fluid.bench.box": "Một hộp nước kín",

  // Air past an aircraft
  "js.fluid.bench.plane": "Không khí lướt qua máy bay",

  // Flow past a stone
  "js.fluid.bench.stone": "Dòng chảy qua hòn đá",

  // {u} m/s
  "js.fluid.speed": "{u} m/s",

  // {d} mm
  "js.fluid.sizeMm": "{d} mm",

  // {v} mm²/s
  "js.fluid.visc": "{v} mm²/s",

  // {s} s
  "js.fluid.time": "{s} s",

  // closed box
  "js.fluid.noInflow": "hộp kín",

  // Re ≈ {re}
  "js.fluid.reTag": "Re ≈ {re}",

  // {n} ms
  "js.fluid.steps": "{n} ms",

  // steady
  "js.fluid.steady": "ổn định",

  // The storm is growing: {pct} % of its starting energy
  "js.fluid.v.storm.head": "Cơn bão đang lớn lên: {pct} % năng lượng lúc đầu",

  // The centre is being fed faster than friction can drain it, so the swirl spreads and the cloud
  // winds into arms. Turn viscosity up until friction wins.
  "js.fluid.v.storm.detail": "Tâm bão được nuôi nhanh hơn tốc độ ma sát rút đi, nên xoáy lan rộng và các dải mây cuộn thành cánh tay. Tăng độ nhớt lên cho đến khi ma sát thắng.",

  // Friction is winning: the storm has {pct} % of its energy left
  "js.fluid.v.stormDying.head": "Ma sát đang thắng: cơn bão còn {pct} % năng lượng",

  // At this viscosity friction drains energy faster than the centre is fed. Lower the viscosity and
  // the storm grows again.
  "js.fluid.v.stormDying.detail": "Với độ nhớt này, ma sát rút năng lượng nhanh hơn tốc độ tâm bão được nuôi. Hạ độ nhớt xuống và cơn bão sẽ lớn trở lại.",

  // Friction is using up the energy: {pct} % left
  "js.fluid.v.decay.head": "Ma sát đang tiêu hao năng lượng: còn {pct} %",

  // The carrying term only moves swirl around - watch two swirls circle and join. Friction only
  // takes it away. With nothing pushing, the total can only fall, and faster for a thicker fluid.
  "js.fluid.v.decay.detail": "Số hạng cuốn theo chỉ chuyển xoáy từ chỗ này sang chỗ khác - xem hai xoáy quay quanh nhau rồi nhập lại. Ma sát chỉ lấy đi. Không có gì đẩy thêm, tổng chỉ có thể giảm, và giảm nhanh hơn với chất lưu đặc hơn.",

  // Honey: friction wins completely
  "js.fluid.v.honey.head": "Mật ong: ma sát thắng tuyệt đối",

  // The flow closes up behind the stone as smoothly as it opened. Played backwards it would look the
  // same, and no waiting will make it swing - the friction term is bigger than the carrying term
  // almost everywhere.
  "js.fluid.v.honey.detail": "Dòng chảy khép lại phía sau hòn đá mượt như khi nó mở ra. Chiếu ngược lại trông vẫn y vậy, và chờ bao lâu cũng không làm nó lắc - số hạng ma sát lớn hơn số hạng cuốn theo ở gần như mọi nơi.",

  // Two swirls sit still behind the stone
  "js.fluid.v.pair.head": "Hai xoáy đứng yên phía sau hòn đá",

  // The carrying term is strong enough to leave a pair of swirls behind the stone, but friction
  // holds them in place. The sensor line stays flat. Below Re ≈ 47 this is as far as it goes.
  "js.fluid.v.pair.detail": "Số hạng cuốn theo đủ mạnh để để lại một cặp xoáy phía sau hòn đá, nhưng ma sát giữ chúng đứng yên. Đường cảm biến vẫn thẳng. Dưới Re ≈ 47, mọi chuyện chỉ đến thế.",

  // Waiting for the flow to choose
  "js.fluid.v.wait.head": "Chờ dòng chảy chọn bên",

  // By the numbers the carrying term can win here, but the flow is still the same on top and bottom.
  // A tiny error in the numbers is growing behind the stone. Watch the sensor line.
  "js.fluid.v.wait.detail": "Theo con số thì số hạng cuốn theo có thể thắng ở đây, nhưng dòng chảy vẫn giống nhau ở trên và dưới. Một sai số nhỏ xíu trong các con số đang lớn dần phía sau hòn đá. Hãy xem đường cảm biến.",

  // Vortex street: the flow swings by itself
  "js.fluid.v.street.head": "Dãy xoáy: dòng chảy tự lắc",

  // Swirls break off from top and bottom in turn, one every {T} ms, with nobody shaking the stone.
  // Strouhal number D∕(U·T) = {st} - the textbook value is about 0.2.
  "js.fluid.v.street.detail": "Các xoáy lần lượt tách ra từ trên và dưới, cứ mỗi {T} ms một xoáy, mà không ai lay hòn đá. Số Strouhal D∕(U·T) = {st} - giá trị trong sách là khoảng 0,2.",

  // Carrying wins: the flow turns messy
  "js.fluid.v.wild.head": "Cuốn theo thắng: dòng chảy trở nên hỗn độn",

  // Friction can no longer smooth the small swirls away before new ones form. In three dimensions
  // this is where turbulence would start. Here the grid decides how small the swirls can get.
  "js.fluid.v.wild.detail": "Ma sát không còn kịp làm mượt các xoáy nhỏ trước khi xoáy mới hình thành. Trong ba chiều, đây là nơi chảy rối bắt đầu. Ở đây, lưới quyết định xoáy có thể nhỏ tới đâu.",

  // a growing storm, from above
  "js.fluid.label.storm": "một cơn bão đang lớn dần, nhìn từ trên xuống",

  // closed box · no flow in
  "js.fluid.label.stir": "hộp kín · không có dòng vào",

  // flow → · Re ≈ {re}
  "js.fluid.label.flow": "dòng chảy → · Re ≈ {re}",

  // no stone, so nothing to measure here - watch the energy row instead
  "js.fluid.probe.none": "không có hòn đá nên không có gì để đo ở đây - hãy xem dòng năng lượng",

  // last {n} s →
  "js.fluid.probe.axis": "{n} s gần nhất →",

  // ⏸ Pause
  "js.fluid.pause": "⏸ Dừng",

  // ▶ Play
  "js.fluid.play": "▶ Chạy",

  // .
  "js.leaf.decimal": ",",

  // {u} m/s
  "js.leaf.speed": "{u} m/s",

  // in 1 s
  "js.leaf.ahead": "sau 1 giây",

  // nothing here changes with time
  "js.leaf.steady": "ở đây không có gì thay đổi theo thời gian",

  // where the leaf was, one second apart
  "js.leaf.footprints": "chỗ chiếc lá đã đi qua, cách nhau một giây",

  // water speed here (m/s)
  "js.leaf.axis": "tốc độ nước tại đây (m/s)",

  // wide mark · {u} m/s
  "js.leaf.wideMark": "vạch chỗ rộng · {u} m/s",

  // narrow mark · {u} m/s
  "js.leaf.narrowMark": "vạch chỗ hẹp · {u} m/s",

  // +{du} m/s over {d} m
  "js.leaf.slopeA": "+{du} m/s trên {d} m",

  // = {s} m/s for every metre
  "js.leaf.slopeB": "= {s} m/s cho mỗi mét",

  // {u} m in 1 s
  "js.leaf.run": "{u} m trong 1 s",

  // +{g} m/s
  "js.leaf.rise": "+{g} m/s",

  // The water under me moves at {u} m/s. Change: {z} m/s per second.
  "js.leaf.bridgeBig": "Nước dưới chân tôi chảy {u} m/s. Thay đổi: {z} m/s mỗi giây.",

  // {u} m/s right now, and gaining {g} m/s every second.
  "js.leaf.leafBig": "Lúc này {u} m/s, và mỗi giây nhanh thêm {g} m/s.",

  // In one second it moves {u} m, and every metre the water is {s} m/s faster: {u} × {s} = {g} m/s
  // gained per second.
  "js.leaf.leafSmall": "Trong một giây nó đi được {u} m, và cứ mỗi mét nước lại nhanh thêm {s} m/s: {u} × {s} = {g} m/s nhanh thêm mỗi giây.",

  // The water ahead is no faster here, so nothing is gained right now.
  "js.leaf.leafFlat": "Nước phía trước ở đây không nhanh hơn, nên lúc này không nhanh thêm gì.",

  // {s} m/s per metre
  "js.leaf.perMetre": "{s} m/s trên mỗi mét",

  // {g} m/s per second
  "js.leaf.perSecond": "{g} m/s mỗi giây",

  // change from moving: +{g}
  "js.leaf.chipLeaf": "thay đổi do di chuyển: +{g}",

  // {x} m · {u} m/s
  "js.leaf.bridgeOut": "{x} m · {u} m/s",

  // ⏸ Pause
  "js.leaf.pause": "⏸ Dừng",

  // ▶ Play
  "js.leaf.play": "▶ Chạy",

  // Go to {title}
  "js.lesson.goto": "Tới {title}",

  // .
  "js.push.decimal": ",",

  // pressure
  "js.push.pressureTitle": "áp suất",

  // high
  "js.push.high": "cao",

  // low
  "js.push.low": "thấp",

  // the same on both sides
  "js.push.evenNote": "hai bên bằng nhau",

  // {p} kPa
  "js.push.kpa": "{p} kPa",

  // net push: {n} N on each m³, toward the low side
  "js.push.netPush": "lực đẩy tổng: {n} N lên mỗi m³, về phía áp suất thấp",

  // no net push: squeezed equally, it goes nowhere
  "js.push.noPush": "không có lực đẩy tổng: bị ép đều, khối nước đứng yên",

  // friction
  "js.push.frictionTitle": "ma sát",

  // each layer slides at its own speed
  "js.push.frictionNote": "mỗi lớp trượt với tốc độ riêng",

  // {u} m/s
  "js.push.ms": "{u} m/s",

  // no drag
  "js.push.noDrag": "không có lực kéo",

  // pulled on
  "js.push.pulledOn": "bị kéo tới",

  // held back
  "js.push.heldBack": "bị giữ lại",

  // neighbours' average: {u} m/s
  "js.push.avg": "trung bình các lớp bên cạnh: {u} m/s",

  // μ = {mu} ({name})
  "js.push.muTag": "μ = {mu} ({name})",

  // air
  "js.push.air": "không khí",

  // water
  "js.push.water": "nước",

  // honey
  "js.push.honey": "mật ong",

  // Push: none. Squeezed equally from both sides, the box goes nowhere.
  "js.push.pressBigNone": "Lực đẩy: không. Bị ép đều từ hai phía, khối nước đứng yên.",

  // Push: {n} N toward the {side}, the low side.
  "js.push.pressBig": "Lực đẩy: {n} N về bên {side}, bên áp suất thấp.",

  // right
  "js.push.right": "phải",

  // left
  "js.push.left": "trái",

  // Left face {l} kPa, right face {r} kPa. Only the difference pushes.
  "js.push.pressSmall": "Mặt trái {l} kPa, mặt phải {r} kPa. Chỉ phần chênh lệch mới đẩy.",

  // the same everywhere
  "js.push.tiltFlat": "bằng nhau ở mọi nơi",

  // rises {g} kPa per metre to the {side}
  "js.push.tiltOut": "tăng {g} kPa mỗi mét về bên {side}",

  // Drag: none. Moving with its neighbours, nothing rubs.
  "js.push.dragBigNone": "Lực kéo: không. Đi cùng tốc độ với các lớp bên cạnh, không có gì cọ xát.",

  // Drag: {d} N, {dir}.
  "js.push.dragBig": "Lực kéo: {d} N, {dir}.",

  // pulling the layer forward
  "js.push.pullingOn": "kéo lớp nước tới trước",

  // pulling the layer back
  "js.push.holdingBack": "kéo lớp nước lại",

  // The layer moves at {u} m/s; its neighbours average {a} m/s. In {name}, μ = {mu}.
  "js.push.dragSmall": "Lớp này đi {u} m/s; các lớp bên cạnh trung bình {a} m/s. Trong {name}, μ = {mu}.",

  // {n} N per m³
  "js.push.perM3": "{n} N trên mỗi m³",

  // {m} kg × the gain in speed
  "js.push.mass": "{m} kg × mức nhanh thêm",

  // .
  "js.re.decimal": ",",

  // {v} m/s
  "js.re.ms": "{v} m/s",

  // {v} cm/s
  "js.re.cms": "{v} cm/s",

  // {v} mm/s
  "js.re.mms": "{v} mm/s",

  // {v} µm/s
  "js.re.ums": "{v} µm/s",

  // {v} km
  "js.re.km": "{v} km",

  // {v} m
  "js.re.m": "{v} m",

  // {v} cm
  "js.re.cm": "{v} cm",

  // {v} mm
  "js.re.mm": "{v} mm",

  // {v} µm
  "js.re.um": "{v} µm",

  // Re ≈ {re}
  "js.re.reBig": "Re ≈ {re}",

  // carrying ÷ friction
  "js.re.ratio": "cuốn theo ÷ ma sát",

  // carrying ρU²∕L
  "js.re.carry": "cuốn theo ρU²∕L",

  // friction μU∕L²
  "js.re.fric": "ma sát μU∕L²",

  // {v} N per m³
  "js.re.perM3": "{v} N trên mỗi m³",

  // N on each cubic metre, each step ×1000
  "js.re.axisNote": "N lên mỗi mét khối, mỗi vạch gấp 1000 lần",

  // bacteria
  "js.re.exBacteria": "vi khuẩn",

  // honey from a spoon
  "js.re.exHoney": "mật ong chảy từ thìa",

  // stick in a stream
  "js.re.exStick": "que cắm trong dòng suối",

  // passenger plane
  "js.re.exPlane": "máy bay chở khách",

  // a storm
  "js.re.exStorm": "một cơn bão",

  // very different sizes and speeds, one number places them all
  "js.re.scalesTitle": "kích thước và tốc độ rất khác nhau, một con số xếp tất cả vào chỗ",

  // size L (metres)
  "js.re.sizeRuler": "kích thước L (mét)",

  // speed U (metres per second)
  "js.re.speedRuler": "tốc độ U (mét mỗi giây)",

  // friction wins: smooth layers
  "js.re.creep": "ma sát thắng: các lớp trơn mượt",

  // two quiet swirls behind the object
  "js.re.steady": "hai xoáy lặng sau vật",

  // a vortex street
  "js.re.street": "một dãy xoáy",

  // turbulence
  "js.re.turbulent": "rối loạn",

  // Re = ρUL∕μ
  "js.re.reRuler": "Re = ρUL∕μ",

  // this case
  "js.re.you": "trường hợp này",

  // Re below 1 · friction wins
  "js.re.vCreepTitle": "Re dưới 1 · ma sát thắng",

  // Smooth and layered. Every swirl is wiped out faster than it can form.
  "js.re.vCreep": "Trơn mượt và phân lớp. Mọi xoáy đều bị xóa đi nhanh hơn tốc độ nó hình thành.",

  // Re 1 to 40 · carrying starts to count
  "js.re.vSteadyTitle": "Re từ 1 đến 40 · cuốn theo bắt đầu có tiếng nói",

  // Two quiet swirls sit behind the object and stay there.
  "js.re.vSteady": "Hai xoáy lặng nằm sau vật và ở yên đó.",

  // Re 40 to 2 000 · carrying and friction fight
  "js.re.vStreetTitle": "Re từ 40 đến 2 000 · cuốn theo và ma sát giằng co",

  // Swirls break off behind the object, first one side, then the other: a vortex street.
  "js.re.vStreet": "Các xoáy tách ra phía sau vật, bên này rồi đến bên kia: một dãy xoáy.",

  // Re in the thousands and up · carrying wins
  "js.re.vTurbTitle": "Re từ hàng nghìn trở lên · cuốn theo thắng",

  // Turbulence: swirls inside swirls, down to the size where friction wipes them out.
  "js.re.vTurb": "Rối loạn: xoáy lồng trong xoáy, nhỏ dần đến cỡ mà ma sát xóa được chúng.",

  // Carrying is {r} times friction.
  "js.re.ratioBig": "Cuốn theo lớn gấp {r} lần ma sát.",

  // Friction is {r} times carrying.
  "js.re.ratioSmall": "Ma sát lớn gấp {r} lần cuốn theo.",

});
