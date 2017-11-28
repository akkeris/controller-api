do $$
begin

  -- must be manually run for tests to complete.
  if (select count(*) from stacks where name='maru' and deleted = false) = 0 then
    update stacks set name='maru';
  end if;

  if (select count(*) from spaces where name = 'pipline-test-space1') = 0 then
  	insert into spaces ( space, name ) values ( '565c9b0c-986e-455b-93c8-a146d8d49131', 'pipline-test-space1' );
  end if;

  if (select count(*) from spaces where name = 'pipline-test-space2') = 0 then
  	insert into spaces ( space, name ) values ( '565c9b0c-986e-455b-93c8-a146d8d49133', 'pipline-test-space2' );
  end if;

  if (select count(*) from spaces where name = 'pipline-test-space3') = 0 then
  	insert into spaces ( space, name ) values ( '565c9b0c-986e-455b-93c8-a146d8d49134', 'pipline-test-space3' );
  end if;

  if (select count(*) from authorizations where "authorization" = 'fdd3793e-f9df-43c6-88d0-077dcee27b5e') = 0 then
  	insert into authorizations ("authorization", site, state, scopes, user_id, username, token, expires, invalid) values
    	('fdd3793e-f9df-43c6-88d0-077dcee27b5e', 'site', 'state', 'scopes', 'id', 'username', 'token', now(), false);
  end if;

  if (select count(*) from auto_builds where auto_build = 'c9821358-49ab-41d2-a1c6-f0fe327d1c0d') = 0 then
  	insert into auto_builds (auto_build, app, repo, branch, "authorization", auto_deploy, wait_on_status_checks, user_agent, validation_token) values
      	('c9821358-49ab-41d2-a1c6-f0fe327d1c0d', 'fa2b535d-de4d-4a14-be36-d44af53b59e3', 'repo', 'master', 'fdd3793e-f9df-43c6-88d0-077dcee27b5e', true, true, 'blah', 'blah');
  end if;

  if (select count(*) from certificates) = 0 then 
    insert into certificates (certificate, name, created_by, request, status, comments, org, installed, issued, expires, created, updated, deleted, region)
      values ('7594bb0c-6942-41b1-b3ac-4d42ba44a7bc', 'testuser@abcd.com', 'test-api','54648bc7-34e8-48f7-5ffc-6c75253a9285','needs_approval','Do not approve this, its a test for alamo','0b26ccb5-83cc-4d33-a01f-100c383e0064',false,null,'2017-08-03 08:52:20.598000','2017-08-03 08:52:20.598000','2017-08-03 08:53:13.726000',false,'f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3');
  end if;

  if (select count(*) from certificate_domain_names) = 0 then 
    insert into certificate_domain_names (certificate_domain_name, certificate, name, common_name) 
      values ('a4b9dbee-d519-4360-8b77-a321cdf352f2','7594bb0c-6942-41b1-b3ac-4d42ba44a7bc','donotapprove-test1.abcd.io',true);
  end if;
end$$;