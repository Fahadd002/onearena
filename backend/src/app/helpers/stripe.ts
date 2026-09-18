import Stripe from "stripe";
import config from "../../config/index";


export const stripe: Stripe = new Stripe(config.stripeSecretKey as string);
