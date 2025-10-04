import { Err, Ok, type Result } from "../types/result.js"

export async function send_otp_via_whatsapp(otp: string, phone: string): Promise<Result<void, Error>> {
  try {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: `228${phone}`,
      type: "template",
      template: {
        language: {
          "code": "fr"
        },
        name: "verification_code",
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: otp
              }
            ]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              {
                type: "text",
                text: otp
              }
            ]
          }
        ]
      }
    }
    const url = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_NUM_ID}/messages`
    const result = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
    const body = await result.text()
    console.log(body)
    if (result.status == 200) {
      return Ok(undefined)
    }
    return Err(new Error(`Expected HTTP 200 but got HTTP ${result.status}\n Response: ${body}`))
  } catch (err: unknown) {
    return Err(new Error(`Failed to send otp code ${String(err)}`))
  }
}
