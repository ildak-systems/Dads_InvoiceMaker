let result_map = new Map;

function composeEditInvoice(event)
{
  var par = event.parameters.number;
  par = +par;
  var list = [];
  var firstThread = GmailApp.getInboxThreads(0, 50);
  for (var i = 0; i < firstThread.length; i++)
  {
    var messages = firstThread[i].getMessages()[0];
    if (messages.getFrom() == "Accounting <accounting@sbscorp.com>")
    {
      list.push(messages);
    }
  }
  var invoice_doc = list[par].getPlainBody();
  invoice_doc.split('\n').forEach(getValues);

  //promptUser();

  var dateObj = new Date();
  var month = dateObj.getMonth() + 1;
  var currentdate = month.toString() + "/" + dateObj.getDate().toString() + "/" + dateObj.getFullYear().toString();

  var synergy_temp = DriveApp.getFilesByName("SYNERGY_TEMPLATE").next();
  var synergy_invoice_id = synergy_temp.makeCopy("synergy " + currentdate.toString(), DriveApp.getFolderById("19C1r3VEPvNIEq4K3cUAjDNZ7P1hFD5r8")).getId();
  var synergy_invoice = DocumentApp.openById(synergy_invoice_id);

  synergy_invoice.getBody().replaceText("<SERVICE_PERIOD>", result_map.get("service_period"));
  synergy_invoice.getBody().replaceText("<DATE>", currentdate.toString());
  synergy_invoice.getBody().replaceText("<SYNERGY_PAY>", result_map.get("synergy_pay"));

  var mas_temp = DriveApp.getFilesByName("MAS_TEMPLATE").next();
  var mas_invoice_id = mas_temp.makeCopy("mas " + currentdate.toString(), DriveApp.getFolderById("19C1r3VEPvNIEq4K3cUAjDNZ7P1hFD5r8")).getId();
  var mas_invoice = DocumentApp.openById(mas_invoice_id);
  mas_invoice.getBody().replaceText("<SERVICE_PERIOD>", result_map.get("service_period"));
  mas_invoice.getBody().replaceText("<DATE>", currentdate.toString());
  mas_invoice.getBody().replaceText("<MAS_PAY>", result_map.get("mas_pay"));

  synergy_invoice.saveAndClose();
  mas_invoice.saveAndClose();
  
  sendEmail(list, par, synergy_invoice, mas_invoice);
}

function sendEmail(list, par, synergy, mas)
{
  var synergy_attachment = DocumentApp.openById(synergy.getId());
  var mas_attachment = DocumentApp.openById(mas.getId());

   //list[par].reply("감사합니다", {
    //attachments: [synergy_attachment.getAs(MimeType.PDF), mas_attachment.getAs(MimeType.PDF)]}
    //);

    GmailApp.sendEmail("ildak@uw.edu", "test",{
    attachments: [synergy_attachment.getAs(MimeType.PDF), mas_attachment.getAs(MimeType.PDF)]});

  synergy_attachment.saveAndClose();
  mas_attachment.saveAndClose();
}

function promptUser()
{
  var card = CardService.newCardBuilder();
  var cardSection = CardService.newCardSection().setHeader('Please confirm if the following information is correct');
  cardSection.addWidget(CardService.newTextParagraph().setText(
                  'These widgets are display-only. ' +
                  'A text paragraph can have multiple lines and ' +
                  'formatting.'))
  ;

  return card.addSection(cardSection).build();
}

function onGmailMessageOpen() 
{
  var list = [];
  var firstThread = GmailApp.getInboxThreads(0, 50);
  for (var i = 0; i < firstThread.length; i++)
  {
    var messages = firstThread[i].getMessages()[0];
    //Accounting <accounting@sbscorp.com>
    if (messages.getFrom() == "Accounting <accounting@sbscorp.com>")
    {
      list.push(messages);
    }
  }

  var card = CardService.newCardBuilder();
  var cardSection = CardService.newCardSection().setHeader('Send an Invoice to which email?');
  for (var i = 0; i < list.length; i++)
  {
    cardSection.addWidget( 
          CardService.newTextButton()
              .setText(list[i].getSubject())
              .setOnClickAction(
          CardService.newAction()
              .setFunctionName("composeEditInvoice")
              .setParameters({number: i.toString()})
              )
    );
    // Try: Passing in a number [i] to a function and the function uses the number to find a correct msg in list[]       
  }
  return card.addSection(cardSection).build();
      
}

function getValues(l)
{
  if (l.includes("Synergy $") || l.includes("SYNERGY $"))
  {
    // pay works
    var synergy_pay = l.slice(l.indexOf("$"), 22);
    result_map.set("synergy_pay", synergy_pay);
  }
  if (l.includes("MAS") || l.includes("Mas"))
  {
    var mas_pay = l.slice(l.indexOf("$"));
    result_map.set("mas_pay", mas_pay);
  }
  if (l.includes("SERVICE PERIOD") || l.includes("Service Period"))
  {
    var service_period = l.slice(l.indexOf(": ") + 3);
    result_map.set("service_period", service_period);
  }
}












