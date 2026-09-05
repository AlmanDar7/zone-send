import { Router, Request, Response } from 'express';
import prisma from '../db';

const router = Router();

/**
 * GET /api/public/forms/:id
 * Fetch public form metadata and configuration for direct page rendering
 */
router.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    const form = await prisma.emailTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        subject: true,
        preview_text: true,
        body: true,
        html_body: true,
        design_config: true,
        blocks: true,
        category: true,
      },
    });

    if (!form || form.category !== 'form') {
      return res.status(404).json({ error: 'Form not found or unavailable' });
    }

    res.json(form);
  } catch (error) {
    console.error('Error fetching public form:', error);
    res.status(500).json({ error: 'Failed to load form' });
  }
});

/**
 * GET /api/public/forms/:id/embed.js
 * Serves lightweight vanilla JS widget to embed the form on any website
 */
router.get('/:id/embed.js', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=300');

  try {
    const form = await prisma.emailTemplate.findUnique({
      where: { id },
      select: { id: true, name: true, subject: true, body: true, design_config: true },
    });

    if (!form) {
      return res.send(`console.error("[ReachQuix Form] Form '${id}' not found.");`);
    }

    const apiUrl = process.env.API_BASE_URL || 'http://localhost:5000/api';
    const formConfig = form.design_config as any || {};
    const primaryColor = formConfig.primaryColor || '#10b981';
    const titleText = form.name || 'Join our Newsletter';
    const descText = form.body || 'Subscribe to receive exclusive updates directly in your inbox.';
    const buttonText = formConfig.buttonText || 'Subscribe Now';

    const script = `
(function() {
  var formId = "${id}";
  var targetContainer = document.getElementById("rq-form-" + formId);
  if (!targetContainer) {
    console.warn("[ReachQuix Form] Target container #rq-form-" + formId + " not found in DOM.");
    return;
  }

  var formHtml = \`
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 440px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); color: #0f172a;">
      <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a;">${titleText}</h3>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b; line-height: 1.5;">${descText}</p>
      
      <form id="rq-inner-form-\${formId}" style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Name</label>
          <input type="text" name="name" placeholder="Jane Doe" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; outline: none;" />
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Email Address *</label>
          <input type="email" name="email" required placeholder="jane@example.com" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; outline: none;" />
        </div>
        <button type="submit" style="margin-top: 4px; width: 100%; background: ${primaryColor}; color: #ffffff; border: none; padding: 12px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;">
          ${buttonText}
        </button>
        <div id="rq-msg-\${formId}" style="display: none; font-size: 13px; margin-top: 8px; text-align: center;"></div>
      </form>
    </div>
  \`;

  targetContainer.innerHTML = formHtml;

  var formElem = document.getElementById("rq-inner-form-" + formId);
  var msgElem = document.getElementById("rq-msg-" + formId);

  formElem.addEventListener("submit", function(e) {
    e.preventDefault();
    var formData = new FormData(formElem);
    var payload = {
      name: formData.get("name") || "",
      email: formData.get("email") || ""
    };

    var btn = formElem.querySelector("button[type='submit']");
    btn.disabled = true;
    btn.innerText = "Submitting...";

    fetch("${apiUrl}/public/forms/" + formId + "/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.success) {
        formElem.innerHTML = "<div style='color: #059669; font-weight: 600; text-align: center; padding: 20px 0;'>✓ Thank you for subscribing!</div>";
      } else {
        msgElem.style.display = "block";
        msgElem.style.color = "#dc2626";
        msgElem.innerText = data.error || "Submission failed. Please try again.";
        btn.disabled = false;
        btn.innerText = "${buttonText}";
      }
    })
    .catch(function(err) {
      msgElem.style.display = "block";
      msgElem.style.color = "#dc2626";
      msgElem.innerText = "Network error. Please try again later.";
      btn.disabled = false;
      btn.innerText = "${buttonText}";
    });
  });
})();
`;

    return res.send(script);
  } catch (error) {
    console.error('Error generating embed script:', error);
    res.status(500).send(`console.error("[ReachQuix Form] Internal error loading embed widget.");`);
  }
});

/**
 * POST /api/public/forms/:id/submit
 * Handles public submissions from embedded widgets and landing pages
 */
router.post('/:id/submit', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { email, name, first_name, last_name, company_name, phone } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  try {
    const form = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const userId = form.user_id;
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name ? String(name).trim() : null;
    const cleanFirstName = first_name || (cleanName ? cleanName.split(' ')[0] : null);
    const cleanLastName = last_name || (cleanName && cleanName.includes(' ') ? cleanName.split(' ').slice(1).join(' ') : null);

    // Upsert contact in owner's contact list
    let contact = await prisma.contact.findFirst({
      where: { email: cleanEmail, user_id: userId },
    });

    if (contact) {
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          name: cleanName || contact.name,
          first_name: cleanFirstName || contact.first_name,
          last_name: cleanLastName || contact.last_name,
          company_name: company_name || contact.company_name,
          phone: phone || contact.phone,
          status: 'active',
        },
      });
    } else {
      contact = await prisma.contact.create({
        data: {
          user_id: userId,
          email: cleanEmail,
          name: cleanName,
          first_name: cleanFirstName,
          last_name: cleanLastName,
          company_name: company_name || null,
          phone: phone || null,
          status: 'active',
        },
      });
    }

    // Auto-tag with form name as lead source
    const tagName = `Form: ${form.name.slice(0, 30)}`;
    let tag = await prisma.tag.findFirst({
      where: { name: tagName, user_id: userId },
    });
    if (!tag) {
      tag = await prisma.tag.create({
        data: { name: tagName, user_id: userId },
      });
    }

    const existingTagLink = await prisma.contactTag.findUnique({
      where: {
        contact_id_tag_id: {
          contact_id: contact.id,
          tag_id: tag.id,
        },
      },
    });

    if (!existingTagLink) {
      await prisma.contactTag.create({
        data: {
          contact_id: contact.id,
          tag_id: tag.id,
        },
      });
    }

    res.json({
      success: true,
      message: 'Thank you! Your submission has been received.',
      contactId: contact.id,
    });
  } catch (error: any) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: error.message || 'Failed to submit form' });
  }
});

export default router;
