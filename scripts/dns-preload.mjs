import dns from 'node:dns';

// Some local routers/ISPs refuse external SRV queries, which breaks mongodb+srv URIs.
// Public resolvers are used by default; set NODE_DNS_RESOLVERS=system to opt out.
if (process.env.NODE_DNS_RESOLVERS !== 'system') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}
