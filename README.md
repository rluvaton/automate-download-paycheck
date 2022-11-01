# Download paychecks and send an email with that paycheck

Download from HarGal and Hilan

## What it does:

### Har gal
This will:
1. Login to Har-Gal
2. download paycheck
3. remove paycheck password
4. Send an email with that paycheck from yourself to yourself

   (the recipient address is still your address but use _plus addressing feature_, see below what does it mean and why)
   > _Currently, only gmail is supported_

### Hilan
This will:
1. Login to Hilan
2. download paycheck
3. Send an email with that paycheck from yourself to yourself

   (the recipient address is still your address but use _plus addressing feature_, see below what does it mean and why)
   > _Currently, only gmail is supported_

## Requirements
1. Node.js
2. `qpdf` > 10.2 binary installed (> 10.2 when the support for passing file's password from input introduced)

## Quick start:
1. Copy `.env.template` to `.env` and fill the environment variables
2. run `npm i`
3. run `npm start`

## Questions

### Q: To which email do we send the paycheck to? (tl;dr - only you)

We'll mail send an email from you to special email address that it also yours

If your username is `example`, company name is `google` and the domain is `gmail.com`

it will email the paycheck from `example@gmail.com` to `example+paychecks-google@gmail.com` (or if you use the `HILAN_COMPANY_NAME` (e.g. tony) to send to `example+tony+paychecks-google@gmail.com`)

This is still your email address (see [Google Help - Use your task-specific email addresses](https://support.google.com/a/users/answer/9308648?hl=en) for more)

### Q: What is _plus addressing feature_
It's a feature that lets you receive emails to your email account using variations of your email address.

This way you can really easily filter on those variants.

For example, you can set a label - google-paychecks on every email that the recipient was `example+paychecks-google@gmail.com`

[Gmail Blog - 2 hidden ways to get more from your Gmail address](https://gmail.googleblog.com/2008/03/2-hidden-ways-to-get-more-from-your.html)

### Q: Why do we send to a different address

We send to different address to help you in case you want to automatically label the email based on that email address


