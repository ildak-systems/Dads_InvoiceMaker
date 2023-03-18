// global map container to store predicted values
let searched_values = new Map;

function userOnClickAppLogo()
{
  // create a container to store invoice email threads ID
  let invoice_emails = [];
  // retrieve the first 50 delivered email threads in the user's inbox
  let first_fifty_threads = GmailApp.getInboxThreads(0, 50);

  // search for invoice email threads and store ID
  for (var i = 0; i < first_fifty_threads.length; i++)
  {
    // gets the first message in the thread, needed to fetch .getFrom()
    var email = first_fifty_threads[i].getMessages()[0];
    if (email.getFrom() == "Accounting <accounting@sbscorp.com>")
    {
      // Unfortunately, can't store IDs of emails as we need the messsage object
      // to fetch the subject
      invoice_emails.push(email);
    }
  }

  // Display the invoice email threads to the user using card service
  let display_invoice_card = CardService.newCardBuilder();
  let cardsection = CardService.newCardSection().setHeader("Send an invoice to which email?");
  for (var i = 0; i < invoice_emails.length; i++)
  {
    cardsection.addWidget(
      CardService.newTextButton()
      .setText(invoice_emails[i].getSubject())
      .setOnClickAction(
        CardService.newAction()
        .setLoadIndicator(CardService.LoadIndicator.SPINNER)
        .setFunctionName("composeReply")
        // .getThread().reply(): the .reply() is associated with the last email in the thread
        // pass ID of thread
        .setParameters({id : invoice_emails[i].getThread().getId().toString()}))
      );
  }
  return display_invoice_card.addSection(cardsection).build();
}

function getValues(email_id)
{
  var email = GmailApp.getThreadById(email_id).getMessages()[0];
  var email_text = email.getPlainBody();

  // for every line in email_text
  var lines_of_email = email_text.split('\n');
  for (var i = 0; i < lines_of_email.length; i++)
  {
    var line = lines_of_email[i];
    if (line.includes("Synergy $") || line.includes("SYNERGY $"))
    {
      // what is 22? 
      var synergy_pay = line.slice(line.indexOf("$"), 22);
      searched_values.set("synergy_pay", synergy_pay);
    }
    else if (line.includes("MAS") || line.includes("Mas"))
    {
      var mas_pay = line.slice(line.indexOf("$"));
      searched_values.set("mas_pay", mas_pay);
    }
    else if (line.includes("SERVICE PERIOD") || line.includes("Service Period"))
    {
      var service_period = line.slice(line.indexOf(": ") + 3);
      searched_values.set("service_period", service_period);
    }

    // all valid values are added to the map
  } 
}

function composeReply(ID)
{
  // retrieve the parameter: ID of the selected invoice email
  let selected_invoice_ID = ID.parameters.id;

  // save values to a map: call getValues()
  getValues(selected_invoice_ID);

  // CardService: get user input: PAY, SERVICE PERIOD
  let get_input_card = CardService.newCardBuilder();
  get_input_card.setHeader(CardService.newCardHeader().setTitle("Please fill the form"));
  let cardsection = CardService.newCardSection();

  // create textinput objects for each inputs
  let service_period_input = CardService.newTextInput()
    .setFieldName("serviceperiod")
    .setTitle("Service Period")
    //.setHint("Example: 1/1/2023 - 1/15/2023")
    .setValue(searched_values.get("service_period"));

  let synergy_input = CardService.newTextInput()
    .setFieldName("synergy")
    .setTitle("Synergy Pay")
    //.setHint("$1483")
    .setValue(searched_values.get("synergy_pay"));

  let mas_input = CardService.newTextInput()
    .setFieldName("mas")
    .setTitle("Mas Pay")
    //.setHint("$423")
    .setValue(searched_values.get("mas_pay"));

    cardsection.addWidget(service_period_input);
    cardsection.addWidget(synergy_input);
    cardsection.addWidget(mas_input);

    cardsection.addWidget(CardService.newTextButton()
                            .setText("Send Invoice")
                            .setOnClickAction(CardService.newAction()
                                    .setLoadIndicator(CardService.LoadIndicator.SPINNER)
                                    // the text input automatically gets passed to the set function name
                                    // since text input card objects are part of the same card
                                    .setFunctionName("composeEmailReply")
                                    // try this, if I can send a separate parameters
                                    .setParameters({id : selected_invoice_ID})));

  return get_input_card.addSection(cardsection).build();
}

function composeEmailReply(inputs)
{
  // inputs.formInputs.<fieldName>
  // inputs.parameters.id 
  var dateObj = new Date();
  var month = dateObj.getMonth() + 1;
  var currentdate = month.toString() + "/" + dateObj.getDate().toString() + "/" + dateObj.getFullYear().toString();

  // edit synergy template
  var synergy_temp = DriveApp.getFilesByName("SYNERGY_TEMPLATE").next();
  var synergy_invoice_id = synergy_temp.makeCopy("synergy " + currentdate.toString(), DriveApp.getFolderById("19C1r3VEPvNIEq4K3cUAjDNZ7P1hFD5r8")).getId();
  var synergy_invoice = DocumentApp.openById(synergy_invoice_id);
  synergy_invoice.getBody().replaceText("<SERVICE_PERIOD>", inputs.formInputs.serviceperiod);
  synergy_invoice.getBody().replaceText("<DATE>", currentdate.toString());
  synergy_invoice.getBody().replaceText("<SYNERGY_PAY>", inputs.formInputs.synergy);

  var mas_temp = DriveApp.getFilesByName("MAS_TEMPLATE").next();
  var mas_invoice_id = mas_temp.makeCopy("mas " + currentdate.toString(), DriveApp.getFolderById("19C1r3VEPvNIEq4K3cUAjDNZ7P1hFD5r8")).getId();
  var mas_invoice = DocumentApp.openById(mas_invoice_id);
  mas_invoice.getBody().replaceText("<SERVICE_PERIOD>", inputs.formInputs.serviceperiod);
  mas_invoice.getBody().replaceText("<DATE>", currentdate.toString());
  mas_invoice.getBody().replaceText("<MAS_PAY>", inputs.formInputs.mas);

  // completed and edited invoice ready to send
  synergy_invoice.saveAndClose();
  mas_invoice.saveAndClose();

  //----------------------------------------------------------------------------------------------------------------
  // send invoice email to the selected email thread
  GmailApp.getThreadById(inputs.parameters.id).reply("감사합니다", {
    attachments: [synergy_invoice.getAs(MimeType.PDF), mas_invoice.getAs(MimeType.PDF)]}
    );
    // testing purposes, send the exact copy to my email
    GmailApp.sendEmail("ildak@uw.edu", "Testing subject", 'Testing body', {
    attachments: [synergy_invoice.getAs(MimeType.PDF), mas_invoice.getAs(MimeType.PDF)]});
}
