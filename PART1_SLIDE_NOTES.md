# Part 1 Slide Notes

## Slide 1
เปิดด้วยบริบทว่าโจทย์พูดถึงทีมที่ดูแลหลายโปรเจกต์ที่ Feature/UI คล้ายกัน แต่ต่างกันที่ Business Logic หรือ Design Token แล้วบอกว่าจะเสนอวิธีทำให้เริ่มโปรเจกต์ใหม่เร็วขึ้นโดยไม่ลดคุณภาพ

## Slide 2
อธิบายปัญหา: setup ซ้ำ, QA ซ้ำ, component เดิมตรวจใหม่, คุณภาพแกว่ง เพราะแต่ละโปรเจกต์เริ่มจากศูนย์มากเกินไป

## Slide 3
เสนอ reusable foundation/starter kit แยก common ออกจาก project-specific config เช่น design token, route, copywriting และ business rule

## Slide 4
อธิบาย trade-off ของ monorepo/template repo/scaffolding เลือกตามบริบททีม ไม่จำเป็นต้องใช้คำตอบเดียวทุกสถานการณ์

## Slide 5
อธิบาย quality gate: component contract, smoke test, validation test, visual QA checklist เพื่อไม่ต้องตรวจของที่พิสูจน์แล้วซ้ำจากศูนย์

## Slide 6
สรุปข้อดีข้อจำกัด และปิดด้วยประโยคหลัก: ของที่พิสูจน์แล้วว่าใช้งานได้ควรถูกยกเป็นมาตรฐานกลาง ทีมจะได้ใช้เวลาไปกับ business logic ของลูกค้ามากกว่า
